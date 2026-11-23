package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

func newTestAuthenticator() *Authenticator {
	a := NewAuthenticator("field-notes")
	a.AddUser("mara", "mara@harbourline.example", "correct horse")
	return a
}

func TestLoginAcceptsTheRightPassword(t *testing.T) {
	a := newTestAuthenticator()
	user, err := a.Login(context.Background(), "mara", "correct horse")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if user.Name != "mara" {
		t.Fatalf("got user %q", user.Name)
	}
}

func TestLoginCountsFailures(t *testing.T) {
	a := newTestAuthenticator()
	for i := 0; i < 2; i++ {
		if _, err := a.Login(context.Background(), "mara", "wrong"); !errors.Is(err, ErrUnauthorized) {
			t.Fatalf("got %v, want ErrUnauthorized", err)
		}
	}
	if got := a.FailedAttempts("mara"); got != 2 {
		t.Fatalf("got %d failed attempts, want 2", got)
	}
}

func TestLoginLocksAfterTooManyFailures(t *testing.T) {
	a := newTestAuthenticator()
	for i := 0; i < MaxFailedLogins; i++ {
		_, _ = a.Login(context.Background(), "mara", "wrong")
	}
	if _, err := a.Login(context.Background(), "mara", "correct horse"); !errors.Is(err, ErrLocked) {
		t.Fatalf("got %v, want ErrLocked", err)
	}
}

func TestSessionExpires(t *testing.T) {
	now := time.Date(2026, 3, 1, 9, 0, 0, 0, time.UTC)
	store := NewSessionStore(DefaultSessionTTL)
	store.Now = func() time.Time { return now }

	session, err := store.Create("mara")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if _, err := store.Get(session.ID); err != nil {
		t.Fatalf("Get before expiry: %v", err)
	}
	now = now.Add(DefaultSessionTTL)
	if _, err := store.Get(session.ID); !errors.Is(err, ErrSessionExpired) {
		t.Fatalf("got %v, want ErrSessionExpired", err)
	}
}

func TestGetUnknownSession(t *testing.T) {
	store := NewSessionStore(DefaultSessionTTL)
	if _, err := store.Get("nope"); !errors.Is(err, ErrSessionNotFound) {
		t.Fatalf("got %v, want ErrSessionNotFound", err)
	}
}
