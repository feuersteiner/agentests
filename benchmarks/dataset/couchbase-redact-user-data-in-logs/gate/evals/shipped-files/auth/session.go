package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

// DefaultSessionTTL is how long a session lasts when the store sets no TTL.
const DefaultSessionTTL = 24 * time.Hour

var (
	ErrSessionNotFound = errors.New("auth: no such session")
	ErrSessionExpired  = errors.New("auth: session expired")
)

// Session is one login of one user. Its ID is the value of the session cookie.
type Session struct {
	ID        string
	Username  string
	ExpiresAt time.Time
}

// SessionStore keeps sessions in memory.
type SessionStore struct {
	TTL time.Duration
	Now func() time.Time

	mu       sync.Mutex
	sessions map[string]*Session
}

// NewSessionStore returns an empty store whose sessions last ttl.
func NewSessionStore(ttl time.Duration) *SessionStore {
	return &SessionStore{TTL: ttl, Now: time.Now, sessions: map[string]*Session{}}
}

// Create starts a session for username.
func (s *SessionStore) Create(username string) (*Session, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	session := &Session{
		ID:        hex.EncodeToString(raw),
		Username:  username,
		ExpiresAt: s.Now().Add(DefaultSessionTTL),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = session
	return session, nil
}

// Get returns the session with this id, or ErrSessionNotFound or ErrSessionExpired.
func (s *SessionStore) Get(id string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	session, ok := s.sessions[id]
	if !ok {
		return nil, ErrSessionNotFound
	}
	if !s.Now().Before(session.ExpiresAt) {
		delete(s.sessions, id)
		return nil, ErrSessionExpired
	}
	return session, nil
}

// Delete ends the session with this id.
func (s *SessionStore) Delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}
