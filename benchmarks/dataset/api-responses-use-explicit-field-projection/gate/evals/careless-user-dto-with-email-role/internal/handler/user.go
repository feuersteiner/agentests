package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"corvidfinch.example/marginalia/internal/store"
)

type userProfile struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Bio       string    `json:"bio"`
	AvatarURL string    `json:"avatar_url"`
	JoinedAt  time.Time `json:"joined_at"`
}

// GetUser returns the profile of the user named in the path, for the author page.
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
	writeJSON(w, http.StatusOK, userProfile{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		Bio:       u.Bio,
		AvatarURL: u.AvatarURL,
		JoinedAt:  u.CreatedAt,
	})
}
