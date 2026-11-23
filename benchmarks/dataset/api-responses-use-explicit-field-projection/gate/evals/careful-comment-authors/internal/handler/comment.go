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

// commentAuthor is the public face of a writer or editor who replies to a comment.
type commentAuthor struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
}

type commentResponse struct {
	ID        int64          `json:"id"`
	Name      string         `json:"name"`
	Body      string         `json:"body"`
	CreatedAt time.Time      `json:"created_at"`
	Author    *commentAuthor `json:"author,omitempty"`
}

func toCommentResponse(c model.Comment, author *model.User) commentResponse {
	out := commentResponse{ID: c.ID, Name: c.Name, Body: c.Body, CreatedAt: c.CreatedAt}
	if author != nil {
		out.Author = &commentAuthor{
			ID:        author.ID,
			Name:      author.Name,
			Bio:       author.Bio,
			AvatarURL: author.AvatarURL,
		}
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
	authors := map[int64]*model.User{}
	out := make([]commentResponse, 0, len(comments))
	for _, c := range comments {
		if c.UserID != 0 && authors[c.UserID] == nil {
			u, err := h.store.GetUser(r.Context(), c.UserID)
			if err != nil {
				log.Printf("get author %d of comment %d: %v", c.UserID, c.ID, err)
				writeError(w, http.StatusInternalServerError, "could not load the comments")
				return
			}
			authors[c.UserID] = &u
		}
		out = append(out, toCommentResponse(c, authors[c.UserID]))
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
	if strings.TrimSpace(req.Name) == "" || !strings.Contains(req.Email, "@") || strings.TrimSpace(req.Body) == "" {
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
