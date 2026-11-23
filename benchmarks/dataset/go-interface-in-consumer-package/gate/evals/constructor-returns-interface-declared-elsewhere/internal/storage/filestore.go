// Package storage keeps member profiles on disk, one JSON file per profile.
package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// Profile is one member's profile.
type Profile struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// ErrNotFound is returned by Get when no profile has the given id.
var ErrNotFound = errors.New("storage: profile not found")

// ErrInvalidID is returned when an id cannot be used as a file name.
var ErrInvalidID = errors.New("storage: invalid profile id")

var validID = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,62}$`)

// FileStore reads and writes profiles as <Dir>/<id>.json.
type FileStore struct {
	// Dir is the directory that holds the profile files. It must exist.
	Dir string
}

// NewFileStore returns a FileStore that keeps its files in dir, creating the directory when it is missing.
func NewFileStore(dir string) (Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data directory %q: %w", dir, err)
	}
	return &FileStore{Dir: dir}, nil
}

// Get returns the profile with the given id, or ErrNotFound.
func (s *FileStore) Get(ctx context.Context, id string) (Profile, error) {
	if err := ctx.Err(); err != nil {
		return Profile{}, err
	}
	path, err := s.path(id)
	if err != nil {
		return Profile{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return Profile{}, ErrNotFound
	}
	if err != nil {
		return Profile{}, fmt.Errorf("read profile %q: %w", id, err)
	}
	var profile Profile
	if err := json.Unmarshal(data, &profile); err != nil {
		return Profile{}, fmt.Errorf("decode profile %q: %w", id, err)
	}
	return profile, nil
}

// Put writes the profile, replacing any profile with the same id.
func (s *FileStore) Put(ctx context.Context, profile Profile) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	path, err := s.path(profile.ID)
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		return fmt.Errorf("encode profile %q: %w", profile.ID, err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write profile %q: %w", profile.ID, err)
	}
	return nil
}

func (s *FileStore) path(id string) (string, error) {
	if !validID.MatchString(id) {
		return "", ErrInvalidID
	}
	return filepath.Join(s.Dir, id+".json"), nil
}
