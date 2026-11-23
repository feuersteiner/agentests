package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"pelham.example/stockroom/internal/store"
)

func newService(t *testing.T) *Service {
	t.Helper()
	st := store.New()
	err := st.PutProduct(context.Background(), store.Product{SKU: "CL-118", Name: "Bar clamp 300 mm", PriceCents: 2450, Stock: 12})
	if err != nil {
		t.Fatal(err)
	}
	return New(st, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestCreateOrderTotalsThePrice(t *testing.T) {
	order, err := newService(t).CreateOrder(context.Background(), "CL-118", 3)
	if err != nil {
		t.Fatal(err)
	}
	if order.TotalCents != 7350 {
		t.Fatalf("TotalCents = %d, want 7350", order.TotalCents)
	}
}

func TestCreateOrderUnknownProduct(t *testing.T) {
	_, err := newService(t).CreateOrder(context.Background(), "NOPE", 1)
	if !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("got %v, want store.ErrNotFound", err)
	}
}

func TestCreateOrderRejectsZeroQuantity(t *testing.T) {
	_, err := newService(t).CreateOrder(context.Background(), "CL-118", 0)
	if !errors.Is(err, ErrInvalidQuantity) {
		t.Fatalf("got %v, want ErrInvalidQuantity", err)
	}
}
