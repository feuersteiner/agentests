package rest

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"tidegate/auth"
)

func newTestHandler() *Handler {
	authenticator := auth.NewAuthenticator("field-notes")
	authenticator.AddUser("mara", "mara@harbourline.example", "correct horse")
	return &Handler{Auth: authenticator, Sessions: auth.NewSessionStore(auth.DefaultSessionTTL)}
}

func TestLoginThenWhoAmI(t *testing.T) {
	handler := newTestHandler()

	login := httptest.NewRecorder()
	handler.ServeHTTP(login, httptest.NewRequest(http.MethodPost, "/_session", strings.NewReader(`{"name":"mara","password":"correct horse"}`)))
	if login.Code != http.StatusOK {
		t.Fatalf("login gave %d", login.Code)
	}

	request := httptest.NewRequest(http.MethodGet, "/_session", nil)
	request.AddCookie(login.Result().Cookies()[0])
	who := httptest.NewRecorder()
	handler.ServeHTTP(who, request)
	if who.Code != http.StatusOK || !strings.Contains(who.Body.String(), `"mara"`) {
		t.Fatalf("whoami gave %d %s", who.Code, who.Body.String())
	}
}

func TestWrongPasswordIsUnauthorized(t *testing.T) {
	handler := newTestHandler()
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/_session", strings.NewReader(`{"name":"mara","password":"nope"}`)))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want 401", response.Code)
	}
}

func TestNoCookieIsUnauthorized(t *testing.T) {
	handler := newTestHandler()
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/_session", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want 401", response.Code)
	}
}
