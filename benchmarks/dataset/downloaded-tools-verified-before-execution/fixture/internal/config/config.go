// Package config reads slipway's settings from the environment.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds slipway's settings.
type Config struct {
	Addr        string        // SLIPWAY_ADDR
	Namespace   string        // SLIPWAY_NAMESPACE
	Chart       string        // SLIPWAY_CHART
	HelmTimeout time.Duration // SLIPWAY_HELM_TIMEOUT
}

// Load reads the settings, using the defaults listed in README.md for those
// that are not set.
func Load() (Config, error) {
	c := Config{
		Addr:        getenv("SLIPWAY_ADDR", ":8080"),
		Namespace:   getenv("SLIPWAY_NAMESPACE", "previews"),
		Chart:       getenv("SLIPWAY_CHART", "oci://registry.saltmarsh.example/charts/app"),
		HelmTimeout: 5 * time.Minute,
	}
	if v := os.Getenv("SLIPWAY_HELM_TIMEOUT"); v != "" {
		seconds, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("SLIPWAY_HELM_TIMEOUT: %w", err)
		}
		c.HelmTimeout = time.Duration(seconds) * time.Second
	}
	return c, nil
}

func getenv(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}
