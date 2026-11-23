package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"corvidfinch.example/marginalia/internal/store"
)

type moderationItem struct {
	ID        int64     `json:"id"`
	PostID    int64     `json:"post_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

// AdminListPending lists the comments waiting for an editor's approval, oldest first.
func (h *Handler) AdminListPending(w http.ResponseWriter, r *http.Request) {
	comments, err := h.store.PendingComments(r.Context())
	if err != nil {
		log.Printf("list pending comments: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the queue")
		return
	}
	queue := make([]moderationItem, 0, len(comments))
	for _, c := range comments {
		queue = append(queue, moderationItem{
			ID:        c.ID,
			PostID:    c.PostID,
			Name:      c.Name,
			Email:     c.Email,
			Body:      c.Body,
			CreatedAt: c.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, queue)
}

// AdminApproveComment approves the comment named in the path.
func (h *Handler) AdminApproveComment(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "the comment id must be a number")
		return
	}
	err = h.store.ApproveComment(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such comment")
		return
	}
	if err != nil {
		log.Printf("approve comment %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not approve the comment")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type staffMember struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// AdminListUsers lists the magazine's writers and editors, for the editors' staff page.
func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.store.ListUsers(r.Context())
	if err != nil {
		log.Printf("list users: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the staff")
		return
	}
	staff := make([]staffMember, 0, len(users))
	for _, u := range users {
		staff = append(staff, staffMember{ID: u.ID, Name: u.Name, Email: u.Email, Role: u.Role})
	}
	writeJSON(w, http.StatusOK, staff)
}
