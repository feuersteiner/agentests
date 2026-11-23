// Package config reads slipway's settings from the environment.
package config

import "os"

// HelmBin is the helm binary slipway runs, from SLIPWAY_HELM_BIN.
func HelmBin() string {
	if v := os.Getenv("SLIPWAY_HELM_BIN"); v != "" {
		return v
	}
	return "/usr/local/bin/helm"
}
