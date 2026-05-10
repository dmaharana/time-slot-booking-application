package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"time-slot-booking-server/internal/auth"
	"time-slot-booking-server/internal/config"
	"time-slot-booking-server/internal/db"
	"time-slot-booking-server/internal/logger"
	"time-slot-booking-server/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

type AuthHandler struct {
	db           *db.DB
	oauthConfigs map[string]*oauth2.Config
}

func NewAuthHandler(database *db.DB) *AuthHandler {
	configs := make(map[string]*oauth2.Config)

	// GitHub Config
	configs["github"] = &oauth2.Config{
		ClientID:     config.AppConfig.GithubClientID,
		ClientSecret: config.AppConfig.GithubClientSecret,
		RedirectURL:  config.AppConfig.AppCallbackURL,
		Endpoint:     github.Endpoint,
		Scopes:       []string{"user:email", "read:user"},
	}

	// Atlassian Config
	configs["atlassian"] = &oauth2.Config{
		ClientID:     config.AppConfig.AtlassianClientID,
		ClientSecret: config.AppConfig.AtlassianClientSecret,
		RedirectURL:  config.AppConfig.AppCallbackURL,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://auth.atlassian.com/authorize",
			TokenURL: "https://auth.atlassian.com/oauth/token",
		},
		Scopes: []string{"read:me", "read:account", "email"},
	}

	return &AuthHandler{
		db:           database,
		oauthConfigs: configs,
	}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	oauthConfig, ok := h.oauthConfigs[provider]
	if !ok {
		http.Error(w, "Unknown provider", http.StatusBadRequest)
		return
	}

	// Generate state for CSRF protection
	state := generateState(16)
	// In a real app, you should store this state in a session/cookie and verify it in the callback
	// For this exercise, we'll just pass it along
	
	// Add provider to state so callback knows which config to use
	fullState := fmt.Sprintf("%s:%s", provider, state)

	url := oauthConfig.AuthCodeURL(fullState, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	state := r.FormValue("state")
	code := r.FormValue("code")

	if code == "" {
		http.Error(w, "Code missing", http.StatusBadRequest)
		return
	}

	parts := strings.Split(state, ":")
	if len(parts) < 2 {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}
	provider := parts[0]

	oauthConfig, ok := h.oauthConfigs[provider]
	if !ok {
		http.Error(w, "Unknown provider in state", http.StatusBadRequest)
		return
	}

	token, err := oauthConfig.Exchange(r.Context(), code)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to exchange token")
		http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
		return
	}

	// Fetch user info
	userInfo, err := h.fetchUserInfo(r.Context(), provider, token)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to fetch user info")
		http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
		return
	}

	// Save or update user
	appUser, err := h.saveOrUpdateUser(r.Context(), provider, userInfo, token)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to save user")
		http.Error(w, "Failed to save user", http.StatusInternalServerError)
		return
	}

	// Create JWT for the user session
	jwtToken, err := h.createJWT(appUser)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to create JWT")
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	// Redirect back to frontend with token
	// Since we are serving the UI from the same binary, we can redirect to /
	frontendURL := "/?token=" + jwtToken
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

func (h *AuthHandler) fetchUserInfo(ctx context.Context, provider string, token *oauth2.Token) (map[string]interface{}, error) {
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))
	var url string
	if provider == "github" {
		url = "https://api.github.com/user"
	} else if provider == "atlassian" {
		url = "https://api.atlassian.com/me"
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	decoder := json.NewDecoder(resp.Body)
	decoder.UseNumber() // Prevent scientific notation for large IDs
	if err := decoder.Decode(&result); err != nil {
		return nil, err
	}

	// For GitHub, if email is null, try to fetch it from /user/emails
	if provider == "github" && (result["email"] == nil || result["email"] == "") {
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailResp.Body.Close()
			var emails []map[string]interface{}
			if err := json.NewDecoder(emailResp.Body).Decode(&emails); err == nil {
				for _, e := range emails {
					// Prefer primary and verified email
					if primary, ok := e["primary"].(bool); ok && primary {
						result["email"] = e["email"]
						break
					}
				}
				// Fallback to the first email if no primary is found
				if (result["email"] == nil || result["email"] == "") && len(emails) > 0 {
					result["email"] = emails[0]["email"]
				}
			}
		}
	}

	return result, nil
}

func (h *AuthHandler) saveOrUpdateUser(ctx context.Context, provider string, userInfo map[string]interface{}, token *oauth2.Token) (*models.AppUser, error) {
	var providerUserID string
	var email string
	var name string

	logger.Debug().
		Str("provider", provider).
		Interface("userInfo", userInfo).
		Msg("Saving or updating user")

	if provider == "github" {
		if id, ok := userInfo["id"].(json.Number); ok {
			providerUserID = id.String()
		} else {
			providerUserID = fmt.Sprintf("%v", userInfo["id"])
		}
		
		if userInfo["name"] != nil {
			name = fmt.Sprintf("%v", userInfo["name"])
		}
		if userInfo["email"] != nil {
			email = fmt.Sprintf("%v", userInfo["email"])
		} else {
			email = providerUserID + "@github.com"
		}
	} else if provider == "atlassian" {
		if id, ok := userInfo["account_id"].(string); ok {
			providerUserID = id
		}
		if n, ok := userInfo["name"].(string); ok {
			name = n
		}
		if e, ok := userInfo["email"].(string); ok {
			email = e
		}
	}

	if providerUserID == "" || providerUserID == "<nil>" {
		return nil, fmt.Errorf("provider_user_id is missing from %s response", provider)
	}
	if email == "" || email == "<nil>" {
		return nil, fmt.Errorf("email is missing from %s response", provider)
	}

	hash := auth.HashProviderUser(provider, providerUserID)

	// Encrypt data
	encEmail, err := auth.Encrypt([]byte(email))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt email: %w", err)
	}
	encName, err := auth.Encrypt([]byte(name))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt name: %w", err)
	}
	encProviderUserID, err := auth.Encrypt([]byte(providerUserID))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt provider_user_id: %w", err)
	}
	encAccessToken, err := auth.Encrypt([]byte(token.AccessToken))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt access_token: %w", err)
	}
	encRefreshToken, err := auth.Encrypt([]byte(token.RefreshToken))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt refresh_token: %w", err)
	}

	// Check if user exists
	var appUser models.AppUser
	err = h.db.NewSelect().Model(&appUser).Where("provider_user_hash = ?", hash).Scan(ctx)

	role := "customer"
	// Check for root admins
	rootAdmins := strings.Split(config.AppConfig.RootAdmins, ",")
	for _, adminEmail := range rootAdmins {
		if strings.TrimSpace(adminEmail) == email {
			role = "admin"
			break
		}
	}

	if err != nil {
		// New User
		appUser = models.AppUser{
			Email:            encEmail,
			Name:             encName,
			Provider:         provider,
			ProviderUserID:   encProviderUserID,
			ProviderUserHash: hash,
			AccessToken:      encAccessToken,
			RefreshToken:     encRefreshToken,
			TokenExpiresAt:   token.Expiry,
			Role:             role,
		}
		_, err = h.db.NewInsert().Model(&appUser).Exec(ctx)
		if err != nil {
			return nil, err
		}
	} else {
		// Update existing user
		appUser.Email = encEmail
		appUser.Name = encName
		appUser.AccessToken = encAccessToken
		appUser.RefreshToken = encRefreshToken
		appUser.TokenExpiresAt = token.Expiry
		// Do not overwrite role if it was manually changed, unless it's a root admin
		if role == "admin" {
			appUser.Role = role
		}
		appUser.UpdatedAt = time.Now()

		_, err = h.db.NewUpdate().Model(&appUser).Where("id = ?", appUser.ID).Exec(ctx)
		if err != nil {
			return nil, err
		}
	}

	return &appUser, nil
}

func (h *AuthHandler) createJWT(user *models.AppUser) (string, error) {
	// Decrypt email for claims
	emailBytes, _ := auth.Decrypt(user.Email)
	
	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": string(emailBytes),
		"role":  user.Role,
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func generateState(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
