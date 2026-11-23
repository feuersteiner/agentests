package store

import (
	"context"
	"errors"
	"testing"
)

func TestProductNotFound(t *testing.T) {
	_, err := New().Product(context.Background(), "NOPE")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("got %v, want ErrNotFound", err)
	}
}

func TestAvailableSubtractsReservations(t *testing.T) {
	ctx := context.Background()
	st := New()
	if err := st.PutProduct(ctx, Product{SKU: "HX-204", Name: "Hex key set", PriceCents: 1299, Stock: 40}); err != nil {
		t.Fatal(err)
	}
	if err := st.AddReservation(ctx, "HX-204", 15); err != nil {
		t.Fatal(err)
	}
	got, err := st.Available(ctx, "HX-204")
	if err != nil {
		t.Fatal(err)
	}
	if got != 25 {
		t.Fatalf("Available = %d, want 25", got)
	}
}

func TestSaveOrderNumbersOrders(t *testing.T) {
	ctx := context.Background()
	st := New()
	first, err := st.SaveOrder(ctx, Order{SKU: "HX-204", Quantity: 1, TotalCents: 1299})
	if err != nil {
		t.Fatal(err)
	}
	second, err := st.SaveOrder(ctx, Order{SKU: "HX-204", Quantity: 2, TotalCents: 2598})
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != "ord-0" || second.ID != "ord-1" {
		t.Fatalf("got IDs %q and %q, want ord-0 and ord-1", first.ID, second.ID)
	}
}
