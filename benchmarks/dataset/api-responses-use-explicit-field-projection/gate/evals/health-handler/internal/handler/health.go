package handler

import (
	"log"
	"net/http"
	"runtime/debug"
	"time"
)

var started = time.Now()

// Health reports that the server is up, with its build version, its uptime and how many posts
// the store holds, for the load balancer and the status page.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	version := "dev"
	if info, ok := debug.ReadBuildInfo(); ok && info.Main.Version != "" {
		version = info.Main.Version
	}
	posts, err := h.store.ListPosts(r.Context())
	if err != nil {
		log.Printf("health: list posts: %v", err)
		writeError(w, http.StatusServiceUnavailable, "the store is not answering")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":          "ok",
		"version":         version,
		"uptime_seconds":  int(time.Since(started).Seconds()),
		"published_posts": len(posts),
	})
}
