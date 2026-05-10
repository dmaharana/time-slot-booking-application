package handlers

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

// UI is the embedded filesystem for the UI assets.
// It will be populated during the build process.
//
//go:embed all:dist
var uiFS embed.FS

// StaticHandler returns a handler that serves static files from the embedded FS.
func StaticHandler() http.HandlerFunc {
	// Root of the embedded filesystem
	contentStatic, err := fs.Sub(uiFS, "dist")
	if err != nil {
		panic(err)
	}

	fileServer := http.FileServer(http.FS(contentStatic))

	return func(w http.ResponseWriter, r *http.Request) {
		// If the request is for a file that exists in the embedded FS, serve it.
		// Otherwise, serve index.html (SPA routing).

		cleanPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if cleanPath == "" {
			cleanPath = "index.html"
		}

		f, err := contentStatic.Open(cleanPath)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// If file not found, serve index.html
		index, err := contentStatic.Open("index.html")
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		defer index.Close()

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		io.Copy(w, index)
	}
}

// Optional: Fallback for development where we might want to serve from local disk
func LocalStaticHandler(distDir string) http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(distDir))

	return func(w http.ResponseWriter, r *http.Request) {
		fullPath := path.Join(distDir, r.URL.Path)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			// Serve index.html for SPA
			http.ServeFile(w, r, path.Join(distDir, "index.html"))
			return
		}
		fileServer.ServeHTTP(w, r)
	}
}
