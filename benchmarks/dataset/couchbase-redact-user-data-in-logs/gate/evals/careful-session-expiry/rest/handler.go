// Package rest is Tidegate's HTTP API.
package rest

import (
	"encoding/json"
	"errors"
	"net/http"

	"tidegate/auth"
	"tidegate/base"
)

// SessionCookie is the name of the cookie that carries the session id.
const SessionCookie = "TidegateSession"

// Handler serves the API of one database.
type Handler struct {
	Auth     *auth.Authenticator
	Sessions *auth.SessionStore
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.URL.Path == "/_session" && r.Method == http.MethodPost:
		h.login(w, r)
	case r.URL.Path == "/_session" && r.Method == http.MethodGet:
		h.whoAmI(w, r)
	case r.URL.Path == "/_session" && r.Method == http.MethodDelete:
		h.logout(w, r)
	default:
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad_request"})
		return
	}
	user, err := h.Auth.Login(r.Context(), credentials.Name, credentials.Password)
	if err != nil {
		writeError(w, err)
		return
	}
	session, err := h.Sessions.Create(user.Name)
	if err != nil {
		writeError(w, err)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: SessionCookie, Value: session.ID, Path: "/", HttpOnly: true, Expires: session.ExpiresAt})
	writeJSON(w, http.StatusOK, map[string]string{"name": user.Name})
}

func (h *Handler) whoAmI(w http.ResponseWriter, r *http.Request) {
	session, err := h.session(r)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"name": session.Username})
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(SessionCookie); err == nil {
		h.Sessions.Delete(cookie.Value)
	}
	http.SetCookie(w, &http.Cookie{Name: SessionCookie, Value: "", Path: "/", MaxAge: -1})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// session returns the session the request's cookie names.
func (h *Handler) session(r *http.Request) (*auth.Session, error) {
	cookie, err := r.Cookie(SessionCookie)
	if err != nil {
		return nil, auth.ErrSessionNotFound
	}
	session, err := h.Sessions.Get(cookie.Value)
	if errors.Is(err, auth.ErrSessionExpired) {
		base.InfofCtx(r.Context(), "Session expired on %s, answering 401", base.MD(h.Auth.DBName))
	}
	return session, err
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, auth.ErrUnauthorized), errors.Is(err, auth.ErrSessionNotFound), errors.Is(err, auth.ErrSessionExpired):
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	case errors.Is(err, auth.ErrLocked):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "locked"})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
