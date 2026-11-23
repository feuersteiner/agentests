// Package store keeps products, reservations and orders in memory.
package store

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

// ErrNotFound is returned when no product has the given SKU.
var ErrNotFound = errors.New("product not found")

// Product is one item of the catalogue.
type Product struct {
	SKU        string
	Name       string
	PriceCents int64
	Stock      int
}

// Order is a placed order for one product.
type Order struct {
	ID         string
	SKU        string
	Quantity   int
	TotalCents int64
}

// Store is safe for concurrent use.
type Store struct {
	mu       sync.Mutex
	products map[string]Product
	reserved map[string]int
	orders   []Order
	nextID   int
}

// New returns an empty store.
func New() *Store {
	return &Store{products: map[string]Product{}, reserved: map[string]int{}}
}

// PutProduct adds a product, or replaces the one with the same SKU.
func (s *Store) PutProduct(ctx context.Context, p Product) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if p.SKU == "" {
		return errors.New("product has no SKU")
	}
	if p.PriceCents < 0 {
		return fmt.Errorf("product %q has a negative price", p.SKU)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.products[p.SKU] = p
	return nil
}

// Product returns the product with the given SKU, or ErrNotFound.
func (s *Store) Product(ctx context.Context, sku string) (Product, error) {
	if err := ctx.Err(); err != nil {
		return Product{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.products[sku]
	if !ok {
		return Product{}, ErrNotFound
	}
	return p, nil
}

// All returns every product of the catalogue.
func (s *Store) All(ctx context.Context) ([]Product, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	products := make([]Product, 0, len(s.products))
	for _, p := range s.products {
		products = append(products, p)
	}
	return products, nil
}

// Available returns how many units of a product are in stock and not reserved.
func (s *Store) Available(ctx context.Context, sku string) (int, error) {
	if err := ctx.Err(); err != nil {
		return 0, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.products[sku]
	if !ok {
		return 0, ErrNotFound
	}
	return p.Stock - s.reserved[sku], nil
}

// AddReservation sets aside units of a product. It does not check availability.
func (s *Store) AddReservation(ctx context.Context, sku string, quantity int) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.products[sku]; !ok {
		return ErrNotFound
	}
	s.reserved[sku] += quantity
	return nil
}

// SaveOrder stores an order and returns it with its new ID.
func (s *Store) SaveOrder(ctx context.Context, o Order) (Order, error) {
	if err := ctx.Err(); err != nil {
		return Order{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	o.ID = fmt.Sprintf("ord-%d", s.nextID)
	s.nextID++
	s.orders = append(s.orders, o)
	return o, nil
}
