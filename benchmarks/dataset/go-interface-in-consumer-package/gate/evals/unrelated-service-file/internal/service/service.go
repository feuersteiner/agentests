// Package service holds the stock reservation logic.
package service

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
)

// Service reserves stock for orders.
type Service struct {
	db  *sql.DB
	log *slog.Logger
}

// NewService returns a Service that reads and writes stock in db.
func NewService(db *sql.DB, log *slog.Logger) *Service {
	return &Service{db: db, log: log}
}

// Reserve takes qty units of sku out of the available stock.
func (s *Service) Reserve(sku string, qty int) error {
	result, err := s.db.Exec("UPDATE stock SET available = available - ? WHERE sku = ? AND available >= ?", qty, sku, qty)
	if err != nil {
		return fmt.Errorf("reserve %d of %q: %w", qty, sku, err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("reserve %d of %q: %w", qty, sku, err)
	}
	if rows == 0 {
		return fmt.Errorf("reserve %d of %q: not enough stock", qty, sku)
	}
	return nil
}

func decode(data []byte, into interface{}) error {
	return json.Unmarshal(data, into)
}
