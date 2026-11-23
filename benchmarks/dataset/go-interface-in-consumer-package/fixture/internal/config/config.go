// Package config reads the service's configuration from the environment.
package config

import "os"

// Config is everything the server needs to start.
type Config struct {
	// Addr is the address the server listens on.
	Addr string
	// DataDir is the directory that holds the profile files.
	DataDir string
}

// Load reads the configuration, falling back to the defaults.
func Load() Config {
	return Config{
		Addr:    getenv("PROFILED_ADDR", ":8080"),
		DataDir: getenv("PROFILED_DATADIR", "./data"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
