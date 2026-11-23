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
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

func toCommentResponse(c model.Comment) commentResponse {
	return commentResponse{ID: c.ID, Name: c.Name, Body: c.Body, CreatedAt: c.CreatedAt}
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
		out = append(out, toCommentResponse(c))
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

type recentComment struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	PostSlug  string    `json:"post_slug"`
	PostTitle string    `json:"post_title"`
}

// LatestComments lists the 20 newest approved comments across all posts, for the homepage.
func (h *Handler) LatestComments(w http.ResponseWriter, r *http.Request) {
	comments, err := h.store.LatestComments(r.Context(), 20)
	if err != nil {
		log.Printf("latest comments: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the comments")
		return
	}
	posts, err := h.store.ListPosts(r.Context())
	if err != nil {
		log.Printf("latest comments: list posts: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the comments")
		return
	}
	postsByID := make(map[int64]model.Post, len(posts))
	for _, p := range posts {
		postsByID[p.ID] = p
	}
	out := make([]recentComment, 0, len(comments))
	for _, c := range comments {
		post := postsByID[c.PostID]
		out = append(out, recentComment{
			ID:        c.ID,
			Name:      c.Name,
			Body:      c.Body,
			CreatedAt: c.CreatedAt,
			PostSlug:  post.Slug,
			PostTitle: post.Title,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
