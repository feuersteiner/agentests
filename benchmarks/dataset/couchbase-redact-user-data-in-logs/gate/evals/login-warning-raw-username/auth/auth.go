// Package auth authenticates Tidegate's users.
package auth

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"sync"

	"tidegate/base"
)

// MaxFailedLogins is how many failed logins in a row lock an account.
const MaxFailedLogins = 10

// WarnAfterFailedLogins is how many failed logins in a row are worth a warning in the log.
const WarnAfterFailedLogins = 3

var (
	ErrUnauthorized = errors.New("auth: wrong name or password")
	ErrLocked       = errors.New("auth: account locked")
)

// User is one account of a database.
type User struct {
	Name         string
	Email        string
	PasswordHash string
	Disabled     bool
}

// Authenticator checks the passwords of one database's users.
type Authenticator struct {
	DBName string

	mu       sync.Mutex
	users    map[string]*User
	failures map[string]int
}

// NewAuthenticator returns an authenticator for the database dbName.
func NewAuthenticator(dbName string) *Authenticator {
	return &Authenticator{DBName: dbName, users: map[string]*User{}, failures: map[string]int{}}
}

// HashPassword returns the stored form of a password.
func HashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

// AddUser registers a user with a password.
func (a *Authenticator) AddUser(name, email, password string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.users[name] = &User{Name: name, Email: email, PasswordHash: HashPassword(password)}
}

// FailedAttempts returns how many logins in a row have failed for name.
func (a *Authenticator) FailedAttempts(name string) int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.failures[name]
}

// Login checks a name and password. A success clears the user's failed attempts.
func (a *Authenticator) Login(ctx context.Context, name, password string) (*User, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.failures[name] >= MaxFailedLogins {
		return nil, ErrLocked
	}
	user, ok := a.users[name]
	hash := HashPassword(password)
	if !ok || user.Disabled || subtle.ConstantTimeCompare([]byte(hash), []byte(user.PasswordHash)) != 1 {
		a.failures[name]++
		if a.failures[name] == WarnAfterFailedLogins {
			base.WarnfCtx(ctx, "User %s failed to log in to %s %d times in a row", name, base.MD(a.DBName), a.failures[name])
		}
		return nil, ErrUnauthorized
	}
	delete(a.failures, name)
	return user, nil
}
