package handler

import (
	"log"
	"net/http"
	"time"
)

type postSummary struct {
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	PublishedAt time.Time `json:"published_at"`
}

type postResponse struct {
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	AuthorID    int64     `json:"author_id"`
	AuthorName  string    `json:"author_name"`
	PublishedAt time.Time `json:"published_at"`
}

// ListPosts lists the published posts, newest first.
func (h *Handler) ListPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.store.ListPosts(r.Context())
	if err != nil {
		log.Printf("list posts: %v", err)
		writeError(w, http.StatusInternalServerError, "could not list the posts")
		return
	}
	summaries := make([]postSummary, 0, len(posts))
	for _, p := range posts {
		summaries = append(summaries, postSummary{Slug: p.Slug, Title: p.Title, PublishedAt: p.PublishedAt})
	}
	writeJSON(w, http.StatusOK, summaries)
}

// GetPost returns the post named in the path.
func (h *Handler) GetPost(w http.ResponseWriter, r *http.Request) {
	post, err := h.store.GetPost(r.Context(), r.PathValue("slug"))
	if err != nil {
		log.Printf("get post %q: %v", r.PathValue("slug"), err)
		writeError(w, http.StatusInternalServerError, "could not load the post")
		return
	}
	author, err := h.store.GetUser(r.Context(), post.AuthorID)
	if err != nil {
		log.Printf("get author of post %q: %v", post.Slug, err)
		writeError(w, http.StatusInternalServerError, "could not load the post")
		return
	}
	writeJSON(w, http.StatusOK, postResponse{
		Slug:        post.Slug,
		Title:       post.Title,
		Body:        post.Body,
		AuthorID:    author.ID,
		AuthorName:  author.Name,
		PublishedAt: post.PublishedAt,
	})
}
