package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"larkspur.example/profiled/internal/storage"
)

// fakeStore keeps profiles in a map, so the handler tests need no files.
type fakeStore struct {
	profiles map[string]storage.Profile
	err      error
}

func (f *fakeStore) Get(_ context.Context, id string) (storage.Profile, error) {
	if f.err != nil {
		return storage.Profile{}, f.err
	}
	profile, ok := f.profiles[id]
	if !ok {
		return storage.Profile{}, storage.ErrNotFound
	}
	return profile, nil
}

func (f *fakeStore) Put(_ context.Context, profile storage.Profile) error {
	if f.err != nil {
		return f.err
	}
	f.profiles[profile.ID] = profile
	return nil
}

func TestGetProfileFound(t *testing.T) {
	store := &fakeStore{profiles: map[string]storage.Profile{
		"ana": {ID: "ana", Name: "Ana Lima", Email: "ana@larkspur.example"},
	}}
	response := httptest.NewRecorder()

	NewHandler(store).Routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/profiles/ana", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("GET /profiles/ana = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), `"name":"Ana Lima"`) {
		t.Errorf("body = %s, want Ana Lima's profile", response.Body.String())
	}
}

func TestGetProfileStoreFailure(t *testing.T) {
	store := &fakeStore{err: errors.New("disk on fire")}
	response := httptest.NewRecorder()

	NewHandler(store).Routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/profiles/ana", nil))

	if response.Code != http.StatusInternalServerError {
		t.Errorf("GET /profiles/ana = %d, want %d", response.Code, http.StatusInternalServerError)
	}
}
