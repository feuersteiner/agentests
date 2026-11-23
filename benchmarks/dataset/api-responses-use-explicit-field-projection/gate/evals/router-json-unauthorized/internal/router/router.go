// Package router wires marginalia's routes in two groups: the public group, open to anyone
// without authentication, and the admin group, for the magazine's editors.
package router

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"

	"corvidfinch.example/marginalia/internal/handler"
)

type route struct {
	pattern string
	handler http.HandlerFunc
}

// New returns the server's routes. Admin routes need the header "Authorization: Bearer
// <adminToken>"; when adminToken is empty, they answer 401 to everyone.
func New(h *handler.Handler, adminToken string) http.Handler {
	public := []route{
		{"GET /api/posts", h.ListPosts},
		{"GET /api/posts/{slug}", h.GetPost},
		{"GET /api/posts/{slug}/comments", h.ListComments},
		{"GET /api/comments/latest", h.LatestComments},
		{"POST /api/posts/{slug}/comments", h.CreateComment},
	}
	admin := []route{
		{"GET /api/admin/comments/pending", h.AdminListPending},
		{"POST /api/admin/comments/{id}/approve", h.AdminApproveComment},
	}

	mux := http.NewServeMux()
	for _, rt := range public {
		mux.Handle(rt.pattern, rt.handler)
	}
	for _, rt := range admin {
		mux.Handle(rt.pattern, requireToken(adminToken, rt.handler))
	}
	return mux
}

func requireToken(token string, next http.Handler) http.Handler {
	want := []byte("Bearer " + token)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := []byte(r.Header.Get("Authorization"))
		if token == "" || subtle.ConstantTimeCompare(got, want) != 1 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "this route needs the editors' token"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
