// Package service holds stockroom's business operations.
package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"pelham.example/stockroom/internal/pricing"
	"pelham.example/stockroom/internal/store"
)

// ErrInvalidQuantity is returned when a quantity is zero or less.
var ErrInvalidQuantity = errors.New("quantity must be at least 1")

// Service runs the operations on top of a store.
type Service struct {
	store  *store.Store
	prices *pricing.Client
	log    *slog.Logger
}

// New returns a service that works on st, prices orders with prices and reports what it does to log.
func New(st *store.Store, prices *pricing.Client, log *slog.Logger) *Service {
	return &Service{store: st, prices: prices, log: log}
}

// ListProducts returns the catalogue.
func (s *Service) ListProducts(ctx context.Context) ([]store.Product, error) {
	products, err := s.store.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}

// CreateOrder places an order for quantity units of the product with the given SKU, at the
// pricing service's current price.
func (s *Service) CreateOrder(ctx context.Context, sku string, quantity int) (store.Order, error) {
	if quantity < 1 {
		return store.Order{}, ErrInvalidQuantity
	}
	if _, err := s.store.Product(ctx, sku); err != nil {
		return store.Order{}, fmt.Errorf("look up product %q: %w", sku, err)
	}
	price, err := s.prices.CurrentPrice(ctx, sku)
	if err != nil {
		return store.Order{}, fmt.Errorf("fetch current price of %q: %w", sku, err)
	}
	order, err := s.store.SaveOrder(ctx, store.Order{
		SKU:        sku,
		Quantity:   quantity,
		TotalCents: price * int64(quantity),
	})
	if err != nil {
		return store.Order{}, fmt.Errorf("save order for %q: %w", sku, err)
	}
	s.log.Info("order created", "id", order.ID, "sku", sku, "quantity", quantity, "price_cents", price)
	return order, nil
}
