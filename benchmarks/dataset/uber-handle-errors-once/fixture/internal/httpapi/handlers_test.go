package httpapi

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"pelham.example/stockroom/internal/service"
	"pelham.example/stockroom/internal/store"
)

func newAPI(t *testing.T) http.Handler {
	t.Helper()
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	st := store.New()
	err := st.PutProduct(context.Background(), store.Product{SKU: "SD-560", Name: "Screwdriver set", PriceCents: 1890, Stock: 25})
	if err != nil {
		t.Fatal(err)
	}
	return New(service.New(st, log), log).Routes()
}

func TestCreateOrder(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"sku":"SD-560","quantity":2}`))
	newAPI(t).ServeHTTP(recorder, request)
	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"total":"37.80"`) {
		t.Fatalf("body = %s, want a total of 37.80", recorder.Body.String())
	}
}

func TestCreateOrderUnknownProduct(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(`{"sku":"NOPE","quantity":1}`))
	newAPI(t).ServeHTTP(recorder, request)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", recorder.Code)
	}
}

func TestListProducts(t *testing.T) {
	recorder := httptest.NewRecorder()
	newAPI(t).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/products", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"price":"18.90"`) {
		t.Fatalf("body = %s, want a price of 18.90", recorder.Body.String())
	}
}
