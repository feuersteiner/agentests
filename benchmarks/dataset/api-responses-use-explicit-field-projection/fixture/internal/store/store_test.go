package store

import (
	"context"
	"errors"
	"testing"
	"time"

	"corvidfinch.example/marginalia/internal/model"
)

var day = time.Date(2026, 3, 2, 9, 0, 0, 0, time.UTC)

func TestListPostsSkipsDraftsNewestFirst(t *testing.T) {
	s := New()
	s.AddPost(model.Post{Slug: "older", PublishedAt: day})
	s.AddPost(model.Post{Slug: "draft", Draft: true, PublishedAt: day.Add(48 * time.Hour)})
	s.AddPost(model.Post{Slug: "newer", PublishedAt: day.Add(24 * time.Hour)})

	posts, err := s.ListPosts(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(posts) != 2 || posts[0].Slug != "newer" || posts[1].Slug != "older" {
		t.Fatalf("got %+v, want newer then older", posts)
	}
}

func TestGetPostNotFound(t *testing.T) {
	s := New()
	s.AddPost(model.Post{Slug: "draft", Draft: true})
	for _, slug := range []string{"missing", "draft"} {
		if _, err := s.GetPost(context.Background(), slug); !errors.Is(err, ErrNotFound) {
			t.Errorf("GetPost(%q) error = %v, want ErrNotFound", slug, err)
		}
	}
}

func TestCommentsWaitForApproval(t *testing.T) {
	ctx := context.Background()
	s := New()
	post := s.AddPost(model.Post{Slug: "kestrels", PublishedAt: day})
	c, err := s.AddComment(ctx, model.Comment{PostID: post.ID, Name: "Ines", Body: "Lovely photos."})
	if err != nil {
		t.Fatal(err)
	}

	listed, _ := s.ListComments(ctx, post.ID)
	pending, _ := s.PendingComments(ctx)
	if len(listed) != 0 || len(pending) != 1 {
		t.Fatalf("before approval: %d listed, %d pending; want 0 and 1", len(listed), len(pending))
	}

	if err := s.ApproveComment(ctx, c.ID); err != nil {
		t.Fatal(err)
	}
	listed, _ = s.ListComments(ctx, post.ID)
	pending, _ = s.PendingComments(ctx)
	if len(listed) != 1 || len(pending) != 0 {
		t.Fatalf("after approval: %d listed, %d pending; want 1 and 0", len(listed), len(pending))
	}
}

func TestApproveCommentNotFound(t *testing.T) {
	if err := New().ApproveComment(context.Background(), 42); !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v, want ErrNotFound", err)
	}
}
