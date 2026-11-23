package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"corvidfinch.example/marginalia/internal/model"
	"corvidfinch.example/marginalia/internal/store"
)

// authorPage is the user plus their published posts.
type authorPage struct {
	model.User
	Posts []postSummary `json:"posts"`
}

// GetUser returns the author page of the user named in the path.
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "the user id must be a number")
		return
	}
	user, err := h.store.GetUser(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such user")
		return
	}
	if err != nil {
		log.Printf("get user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	posts, err := h.store.ListPosts(r.Context())
	if err != nil {
		log.Printf("list posts of user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	page := authorPage{User: user, Posts: []postSummary{}}
	for _, p := range posts {
		if p.AuthorID == user.ID {
			page.Posts = append(page.Posts, postSummary{Slug: p.Slug, Title: p.Title, PublishedAt: p.PublishedAt})
		}
	}
	writeJSON(w, http.StatusOK, page)
}
