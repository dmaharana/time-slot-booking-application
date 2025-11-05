package handlers

import (
	"encoding/json"
	"net/http"
	"time-slot-booking-server/internal/models"
	"time-slot-booking-server/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ResourceHandler struct {
	resourceService *services.ResourceService
}

func NewResourceHandler(resourceService *services.ResourceService) *ResourceHandler {
	return &ResourceHandler{resourceService: resourceService}
}

// @Summary Get all resources
// @Description Retrieve all resources
// @Tags resources
// @Produce json
// @Success 200 {array} models.Resource
// @Router /api/resources [get]
func (h *ResourceHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	resources, err := h.resourceService.GetAll(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resources)
}

// @Summary Get resource by ID
// @Description Retrieve a specific resource by its ID
// @Tags resources
// @Produce json
// @Success 200 {object} models.Resource
// @Router /api/resources/{id} [get]
func (h *ResourceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	resource, err := h.resourceService.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Resource not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resource)
}

// @Summary Create new resource
// @Description Create a new resource (admin only)
// @Tags resources
// @Accept json
// @Produce json
// @Success 201 {object} models.Resource
// @Router /api/resources [post]
func (h *ResourceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateResourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	resource, err := h.resourceService.Create(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resource)
}

// @Summary Update resource
// @Description Update an existing resource (admin only)
// @Tags resources
// @Accept json
// @Produce json
// @Success 200 {object} models.Resource
// @Router /api/resources/{id} [put]
func (h *ResourceHandler) Update(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	resource, err := h.resourceService.Update(r.Context(), id, updates)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resource)
}

// @Summary Delete resource
// @Description Delete a resource (admin only)
// @Tags resources
// @Success 204
// @Router /api/resources/{id} [delete]
func (h *ResourceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	err = h.resourceService.Delete(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Get resources by type
// @Description Retrieve resources of a specific type
// @Tags resources
// @Produce json
// @Success 200 {array} models.Resource
// @Router /api/resources/type/{type} [get]
func (h *ResourceHandler) GetByType(w http.ResponseWriter, r *http.Request) {
	resourceType := chi.URLParam(r, "type")

	resources, err := h.resourceService.GetByType(r.Context(), resourceType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resources)
}
