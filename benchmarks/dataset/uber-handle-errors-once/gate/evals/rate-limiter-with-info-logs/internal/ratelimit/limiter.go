// Package ratelimit caps how many requests a client may make per minute.
package ratelimit

import (
	"log/slog"
	"sync"
	"time"
)

// Limiter counts requests per client in one-minute windows.
type Limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Time
	counts map[string]int
	log    *slog.Logger
}

// New returns a limiter that allows limit requests per client and minute.
func New(limit int, log *slog.Logger) *Limiter {
	return &Limiter{limit: limit, counts: map[string]int{}, log: log}
}

// Allow reports whether the client may make another request now.
func (l *Limiter) Allow(client string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if window := now.Truncate(time.Minute); !window.Equal(l.window) {
		l.log.Debug("new rate limit window", "start", window, "clients", len(l.counts))
		l.window = window
		l.counts = map[string]int{}
	}
	l.counts[client]++
	if l.counts[client] > l.limit {
		l.log.Info("client is over its rate limit", "client", client, "requests", l.counts[client])
		return false
	}
	return true
}
