// Package store keeps marginalia's tables in memory and hands out copies of their rows.
package store

import (
	"context"
	"errors"
	"sort"
	"sync"
	"time"

	"corvidfinch.example/marginalia/internal/model"
)

// ErrNotFound is returned when no row matches.
var ErrNotFound = errors.New("not found")

// Store is safe for concurrent use.
type Store struct {
	mu       sync.RWMutex
	users    map[int64]model.User
	posts    []model.Post
	comments []model.Comment
	nextID   int64
}

// New returns an empty store.
func New() *Store {
	return &Store{users: map[int64]model.User{}}
}

func (s *Store) id() int64 {
	s.nextID++
	return s.nextID
}

// AddUser stores a user and returns it with its id.
func (s *Store) AddUser(u model.User) model.User {
	s.mu.Lock()
	defer s.mu.Unlock()
	u.ID = s.id()
	s.users[u.ID] = u
	return u
}

// AddPost stores a post and returns it with its id.
func (s *Store) AddPost(p model.Post) model.Post {
	s.mu.Lock()
	defer s.mu.Unlock()
	p.ID = s.id()
	s.posts = append(s.posts, p)
	return p
}

// GetUser returns the user with the given id.
func (s *Store) GetUser(ctx context.Context, id int64) (model.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	if !ok {
		return model.User{}, ErrNotFound
	}
	return u, nil
}

// ListPosts returns the published posts, newest first.
func (s *Store) ListPosts(ctx context.Context) ([]model.Post, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var posts []model.Post
	for _, p := range s.posts {
		if !p.Draft {
			posts = append(posts, p)
		}
	}
	sort.Slice(posts, func(i, j int) bool { return posts[i].PublishedAt.After(posts[j].PublishedAt) })
	return posts, nil
}

// GetPost returns the published post with the given slug.
func (s *Store) GetPost(ctx context.Context, slug string) (model.Post, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.posts {
		if p.Slug == slug && !p.Draft {
			return p, nil
		}
	}
	return model.Post{}, ErrNotFound
}

// ListComments returns the approved comments of a post.
func (s *Store) ListComments(ctx context.Context, postID int64) ([]model.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var comments []model.Comment
	for _, c := range s.comments {
		if c.PostID == postID && c.Approved {
			comments = append(comments, c)
		}
	}
	sort.Slice(comments, func(i, j int) bool { return comments[i].CreatedAt.After(comments[j].CreatedAt) })
	return comments, nil
}

// AddComment stores a new comment, not yet approved, and returns it with its id. A comment
// without a time gets the current one.
func (s *Store) AddComment(ctx context.Context, c model.Comment) (model.Comment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c.ID = s.id()
	c.Approved = false
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	s.comments = append(s.comments, c)
	return c, nil
}

// PendingComments returns the comments waiting for approval, oldest first.
func (s *Store) PendingComments(ctx context.Context) ([]model.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var comments []model.Comment
	for _, c := range s.comments {
		if !c.Approved {
			comments = append(comments, c)
		}
	}
	sort.Slice(comments, func(i, j int) bool { return comments[i].CreatedAt.Before(comments[j].CreatedAt) })
	return comments, nil
}

// ApproveComment marks the comment with the given id as approved.
func (s *Store) ApproveComment(ctx context.Context, id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.comments {
		if s.comments[i].ID == id {
			s.comments[i].Approved = true
			return nil
		}
	}
	return ErrNotFound
}
