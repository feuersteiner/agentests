// Package model holds marginalia's database rows: one struct per table, as the store reads and
// writes them.
package model

import "time"

// User is a row of the users table: a writer or an editor of the magazine.
type User struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"` // "writer" or "editor"
	Bio          string    `json:"bio"`
	AvatarURL    string    `json:"avatar_url"`
	CreatedAt    time.Time `json:"created_at"`
}
