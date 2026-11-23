package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"corvidfinch.example/marginalia/internal/store"
)

// GetUser returns the author page data of the user named in the path: the user and their posts.
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "the user id must be a number")
		return
	}
	u, err := h.store.GetUser(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such user")
		return
	}
	if err != nil {
		log.Printf("get user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	all, err := h.store.ListPosts(r.Context())
	if err != nil {
		log.Printf("list posts: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	var titles []string
	for _, p := range all {
		if p.AuthorID == u.ID {
			titles = append(titles, p.Title)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user":        u,
		"post_titles": titles,
		"post_count":  len(titles),
	})
}
