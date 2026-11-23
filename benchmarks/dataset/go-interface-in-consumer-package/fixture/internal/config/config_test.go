package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("PROFILED_ADDR", "")

	cfg := Load()

	if cfg.Addr != ":8080" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, ":8080")
	}
}

func TestLoadReadsAddr(t *testing.T) {
	t.Setenv("PROFILED_ADDR", "127.0.0.1:9090")

	cfg := Load()

	if cfg.Addr != "127.0.0.1:9090" {
		t.Errorf("Addr = %q, want %q", cfg.Addr, "127.0.0.1:9090")
	}
}
