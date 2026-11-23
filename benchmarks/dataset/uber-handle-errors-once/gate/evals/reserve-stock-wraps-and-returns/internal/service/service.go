// Package service holds stockroom's business operations.
package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"pelham.example/stockroom/internal/store"
)

// ErrInvalidQuantity is returned when a quantity is zero or less.
var ErrInvalidQuantity = errors.New("quantity must be at least 1")

// ErrInsufficientStock is returned when fewer units are available than were asked for.
var ErrInsufficientStock = errors.New("insufficient stock")

// Service runs the operations on top of a store.
type Service struct {
	store *store.Store
	log   *slog.Logger
}

// New returns a service that works on st and reports what it does to log.
func New(st *store.Store, log *slog.Logger) *Service {
	return &Service{store: st, log: log}
}

// ListProducts returns the catalogue.
func (s *Service) ListProducts(ctx context.Context) ([]store.Product, error) {
	products, err := s.store.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}

// ReserveStock sets aside qty units of the product with the given SKU when that many are
// available.
func (s *Service) ReserveStock(ctx context.Context, sku string, qty int) error {
	if qty < 1 {
		return ErrInvalidQuantity
	}
	available, err := s.store.Available(ctx, sku)
	if err != nil {
		return fmt.Errorf("check availability of %q: %w", sku, err)
	}
	if available < qty {
		return fmt.Errorf("reserve %d of %q, %d available: %w", qty, sku, available, ErrInsufficientStock)
	}
	if err := s.store.AddReservation(ctx, sku, qty); err != nil {
		return fmt.Errorf("record reservation of %q: %w", sku, err)
	}
	s.log.Info("stock reserved", "sku", sku, "quantity", qty)
	return nil
}

// CreateOrder places an order for quantity units of the product with the given SKU, at the
// catalogue price.
func (s *Service) CreateOrder(ctx context.Context, sku string, quantity int) (store.Order, error) {
	if quantity < 1 {
		return store.Order{}, ErrInvalidQuantity
	}
	product, err := s.store.Product(ctx, sku)
	if err != nil {
		return store.Order{}, fmt.Errorf("look up product %q: %w", sku, err)
	}
	order, err := s.store.SaveOrder(ctx, store.Order{
		SKU:        sku,
		Quantity:   quantity,
		TotalCents: product.PriceCents * int64(quantity),
	})
	if err != nil {
		return store.Order{}, fmt.Errorf("save order for %q: %w", sku, err)
	}
	s.log.Info("order created", "id", order.ID, "sku", sku, "quantity", quantity)
	return order, nil
}
