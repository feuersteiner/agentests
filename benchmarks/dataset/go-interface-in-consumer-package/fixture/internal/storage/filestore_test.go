package storage

import (
	"context"
	"errors"
	"testing"
)

func TestPutThenGet(t *testing.T) {
	store := &FileStore{Dir: t.TempDir()}
	want := Profile{ID: "ana", Name: "Ana Lima", Email: "ana@larkspur.example"}

	if err := store.Put(context.Background(), want); err != nil {
		t.Fatalf("Put: %v", err)
	}
	got, err := store.Get(context.Background(), "ana")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != want {
		t.Errorf("Get = %+v, want %+v", got, want)
	}
}

func TestGetMissing(t *testing.T) {
	store := &FileStore{Dir: t.TempDir()}

	_, err := store.Get(context.Background(), "nobody")

	if !errors.Is(err, ErrNotFound) {
		t.Errorf("Get error = %v, want ErrNotFound", err)
	}
}

func TestGetRejectsPathInID(t *testing.T) {
	store := &FileStore{Dir: t.TempDir()}

	_, err := store.Get(context.Background(), "../secrets")

	if !errors.Is(err, ErrInvalidID) {
		t.Errorf("Get error = %v, want ErrInvalidID", err)
	}
}
