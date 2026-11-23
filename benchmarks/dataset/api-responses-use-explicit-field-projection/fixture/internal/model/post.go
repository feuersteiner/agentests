package model

import "time"

// Post is a row of the posts table.
type Post struct {
	ID          int64     `json:"id"`
	AuthorID    int64     `json:"author_id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	Draft       bool      `json:"draft"`
	PublishedAt time.Time `json:"published_at"`
}
