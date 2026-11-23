package service

import (
	"context"
	"log/slog"
	"testing"
)

func reserve(t *testing.T, s *Service, sku string, qty int) error {
	t.Helper()
	err := s.ReserveStock(context.Background(), sku, qty)
	if err != nil {
		slog.Error("reserve failed", "err", err)
		t.Logf("ReserveStock(%q, %d): %v", sku, qty, err)
		return err
	}
	return nil
}
