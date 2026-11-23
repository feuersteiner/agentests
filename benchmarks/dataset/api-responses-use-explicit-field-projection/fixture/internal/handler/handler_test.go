package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"corvidfinch.example/marginalia/internal/handler"
	"corvidfinch.example/marginalia/internal/model"
	"corvidfinch.example/marginalia/internal/router"
	"corvidfinch.example/marginalia/internal/store"
)

const token = "test-token"

func newServer(t *testing.T) (http.Handler, *store.Store) {
	t.Helper()
	st := store.New()
	author := st.AddUser(model.User{Name: "Tomas Reyes", Role: "writer"})
	st.AddPost(model.Post{AuthorID: author.ID, Slug: "kestrels", Title: "Kestrels", PublishedAt: time.Now()})
	return router.New(handler.New(st), token), st
}

func do(t *testing.T, srv http.Handler, method, path, body, auth string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if auth != "" {
		req.Header.Set("Authorization", "Bearer "+auth)
	}
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

func TestGetPost(t *testing.T) {
	srv, _ := newServer(t)
	rec := do(t, srv, "GET", "/api/posts/kestrels", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var got struct {
		Title      string `json:"title"`
		AuthorName string `json:"author_name"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got.Title != "Kestrels" || got.AuthorName != "Tomas Reyes" {
		t.Fatalf("got %+v", got)
	}
}

func TestCreateCommentWaitsForApproval(t *testing.T) {
	srv, _ := newServer(t)
	rec := do(t, srv, "POST", "/api/posts/kestrels/comments", `{"name":"Ines","email":"ines@mailbox.example","body":"Lovely."}`, "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: status = %d, want 201", rec.Code)
	}
	var created struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}

	rec = do(t, srv, "GET", "/api/posts/kestrels/comments", "", "")
	if strings.TrimSpace(rec.Body.String()) != "[]" {
		t.Fatalf("before approval: listed %s, want []", rec.Body.String())
	}

	rec = do(t, srv, "POST", "/api/admin/comments/"+strconv.FormatInt(created.ID, 10)+"/approve", "", token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("approve: status = %d, want 204", rec.Code)
	}
	rec = do(t, srv, "GET", "/api/posts/kestrels/comments", "", "")
	var listed []struct {
		Name string `json:"name"`
		Body string `json:"body"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&listed); err != nil {
		t.Fatal(err)
	}
	if len(listed) != 1 || listed[0].Name != "Ines" || listed[0].Body != "Lovely." {
		t.Fatalf("after approval: listed %+v", listed)
	}
}

func TestCreateCommentRejectsMissingFields(t *testing.T) {
	srv, _ := newServer(t)
	for _, body := range []string{
		`{"email":"ines@mailbox.example","body":"Lovely."}`,
		`{"name":"Ines","email":"not-an-address","body":"Lovely."}`,
		`{"name":"Ines","email":"ines@mailbox.example","body":""}`,
		`not json`,
	} {
		if rec := do(t, srv, "POST", "/api/posts/kestrels/comments", body, ""); rec.Code != http.StatusBadRequest {
			t.Errorf("body %s: status = %d, want 400", body, rec.Code)
		}
	}
}

func TestCommentsOfUnknownPost(t *testing.T) {
	srv, _ := newServer(t)
	if rec := do(t, srv, "GET", "/api/posts/nope/comments", "", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestAdminRoutesNeedToken(t *testing.T) {
	srv, _ := newServer(t)
	for _, auth := range []string{"", "wrong"} {
		if rec := do(t, srv, "GET", "/api/admin/comments/pending", "", auth); rec.Code != http.StatusUnauthorized {
			t.Errorf("token %q: status = %d, want 401", auth, rec.Code)
		}
	}
	if rec := do(t, srv, "GET", "/api/admin/comments/pending", "", token); rec.Code != http.StatusOK {
		t.Errorf("right token: status = %d, want 200", rec.Code)
	}
}
