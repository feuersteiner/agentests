package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"corvidfinch.example/marginalia/internal/model"
	"corvidfinch.example/marginalia/internal/store"
)

type commentResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	AuthorID    int64     `json:"author_id,omitempty"`
	AuthorBio   string    `json:"author_bio,omitempty"`
	AuthorPhoto string    `json:"author_photo,omitempty"`
	Body        string    `json:"body"`
	CreatedAt   time.Time `json:"created_at"`
}

// toCommentResponse adds the author's details: the commenter's name and email address, and for
// a reply from a writer or editor, their profile.
func toCommentResponse(c model.Comment, author *model.User) commentResponse {
	out := commentResponse{ID: c.ID, Name: c.Name, Email: c.Email, Body: c.Body, CreatedAt: c.CreatedAt}
	if author != nil {
		out.AuthorID = author.ID
		out.AuthorBio = author.Bio
		out.AuthorPhoto = author.AvatarURL
	}
	return out
}

// ListComments lists the approved comments of the post named in the path.
func (h *Handler) ListComments(w http.ResponseWriter, r *http.Request) {
	post, err := h.store.GetPost(r.Context(), r.PathValue("slug"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such post")
		return
	}
	if err != nil {
		log.Printf("get post %q: %v", r.PathValue("slug"), err)
		writeError(w, http.StatusInternalServerError, "could not load the comments")
		return
	}
	comments, err := h.store.ListComments(r.Context(), post.ID)
	if err != nil {
		log.Printf("list comments of %q: %v", post.Slug, err)
		writeError(w, http.StatusInternalServerError, "could not load the comments")
		return
	}
	out := make([]commentResponse, 0, len(comments))
	for _, c := range comments {
		var author *model.User
		if c.UserID != 0 {
			if u, err := h.store.GetUser(r.Context(), c.UserID); err == nil {
				author = &u
			}
		}
		out = append(out, toCommentResponse(c, author))
	}
	writeJSON(w, http.StatusOK, out)
}

type newComment struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Body  string `json:"body"`
}

type createdComment struct {
	ID     int64  `json:"id"`
	Status string `json:"status"`
}

// CreateComment adds a reader's comment to the post named in the path. The comment waits for an
// editor's approval before it is listed.
func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	post, err := h.store.GetPost(r.Context(), r.PathValue("slug"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such post")
		return
	}
	if err != nil {
		log.Printf("get post %q: %v", r.PathValue("slug"), err)
		writeError(w, http.StatusInternalServerError, "could not save the comment")
		return
	}
	var req newComment
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "the body is not valid JSON")
		return
	}
	if strings.TrimSpace(req.Name) == "" || !strings.Contains(req.Email, "@") || req.Body == "" {
		writeError(w, http.StatusBadRequest, "name, email and body are required")
		return
	}
	c, err := h.store.AddComment(r.Context(), model.Comment{
		PostID: post.ID,
		Name:   strings.TrimSpace(req.Name),
		Email:  strings.TrimSpace(req.Email),
		Body:   req.Body,
		IPHash: hashIP(r.RemoteAddr),
	})
	if err != nil {
		log.Printf("add comment to %q: %v", post.Slug, err)
		writeError(w, http.StatusInternalServerError, "could not save the comment")
		return
	}
	writeJSON(w, http.StatusCreated, createdComment{ID: c.ID, Status: "pending"})
}

// hashIP returns a hex SHA-256 of the client's IP address, for spotting floods of comments.
func hashIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	sum := sha256.Sum256([]byte(host))
	return hex.EncodeToString(sum[:])
}
