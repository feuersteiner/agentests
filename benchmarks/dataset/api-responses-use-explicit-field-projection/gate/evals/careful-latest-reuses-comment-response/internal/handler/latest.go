package handler

import (
	"log"
	"net/http"
)

// latestLimit is how many comments the homepage shows.
const latestLimit = 20

// LatestComments lists the newest approved comments across all posts, for the homepage, in the
// same shape as a post's comment list.
func (h *Handler) LatestComments(w http.ResponseWriter, r *http.Request) {
	comments, err := h.store.LatestComments(r.Context(), latestLimit)
	if err != nil {
		log.Printf("latest comments: %v", err)
		writeError(w, http.StatusInternalServerError, "could not load the comments")
		return
	}
	out := make([]commentResponse, 0, len(comments))
	for _, c := range comments {
		out = append(out, toCommentResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}
