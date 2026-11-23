package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"larkspur.example/profiled/internal/storage"
)

func TestSignupThenGetProfile(t *testing.T) {
	store := &storage.FileStore{Dir: t.TempDir()}
	routes := NewHandler(store).Routes()

	body := `{"id":"ana","name":"Ana Lima","email":"ana@larkspur.example"}`
	signup := httptest.NewRecorder()
	routes.ServeHTTP(signup, httptest.NewRequest(http.MethodPost, "/signup", strings.NewReader(body)))
	if signup.Code != http.StatusCreated {
		t.Fatalf("POST /signup = %d, want %d", signup.Code, http.StatusCreated)
	}

	get := httptest.NewRecorder()
	routes.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/profiles/ana", nil))
	if get.Code != http.StatusOK {
		t.Fatalf("GET /profiles/ana = %d, want %d", get.Code, http.StatusOK)
	}
	if !strings.Contains(get.Body.String(), `"name":"Ana Lima"`) {
		t.Errorf("GET /profiles/ana body = %s, want Ana Lima's profile", get.Body.String())
	}
}

func TestSignupRejectsMissingName(t *testing.T) {
	store := &storage.FileStore{Dir: t.TempDir()}
	routes := NewHandler(store).Routes()

	body := `{"id":"ana","email":"ana@larkspur.example"}`
	response := httptest.NewRecorder()
	routes.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/signup", strings.NewReader(body)))

	if response.Code != http.StatusBadRequest {
		t.Errorf("POST /signup = %d, want %d", response.Code, http.StatusBadRequest)
	}
	if _, err := store.Get(context.Background(), "ana"); err == nil {
		t.Error("the profile was saved although the request was rejected")
	}
}
