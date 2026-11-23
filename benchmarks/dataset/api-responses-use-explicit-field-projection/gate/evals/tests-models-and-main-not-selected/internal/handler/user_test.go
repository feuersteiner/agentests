package handler_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"corvidfinch.example/marginalia/internal/model"
)

func TestGetUser(t *testing.T) {
	srv, st := newServer(t)
	u := st.AddUser(model.User{Name: "Maren Holt", Email: "maren@corvidfinch.example", Role: "editor"})
	want, _ := json.Marshal(model.User{ID: u.ID, Name: u.Name})

	rec := do(t, srv, "GET", "/api/users/2", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if len(want) == 0 {
		t.Fatal("empty fixture")
	}
}
