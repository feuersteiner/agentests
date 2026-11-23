package model

import "time"

// Comment is a row of the comments table. Readers comment as guests, with a name and an email
// address. When a writer or an editor replies, UserID holds their user id; otherwise it is 0.
type Comment struct {
	ID        int64     `json:"id"`
	PostID    int64     `json:"post_id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Body      string    `json:"body"`
	IPHash    string    `json:"-"`
	Approved  bool      `json:"approved"`
	CreatedAt time.Time `json:"created_at"`
}
