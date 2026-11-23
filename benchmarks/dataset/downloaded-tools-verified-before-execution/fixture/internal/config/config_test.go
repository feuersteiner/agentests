package config

import (
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	for _, name := range []string{"SLIPWAY_ADDR", "SLIPWAY_NAMESPACE", "SLIPWAY_CHART", "SLIPWAY_HELM_TIMEOUT"} {
		t.Setenv(name, "")
	}
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" {
		t.Errorf("Addr = %q, want :8080", c.Addr)
	}
	if c.Namespace != "previews" {
		t.Errorf("Namespace = %q, want previews", c.Namespace)
	}
	if c.Chart != "oci://registry.saltmarsh.example/charts/app" {
		t.Errorf("Chart = %q", c.Chart)
	}
	if c.HelmTimeout != 5*time.Minute {
		t.Errorf("HelmTimeout = %v, want 5m", c.HelmTimeout)
	}
}

func TestLoadNamespace(t *testing.T) {
	t.Setenv("SLIPWAY_NAMESPACE", "previews-eu")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.Namespace != "previews-eu" {
		t.Errorf("Namespace = %q, want previews-eu", c.Namespace)
	}
}

func TestLoadHelmTimeout(t *testing.T) {
	t.Setenv("SLIPWAY_HELM_TIMEOUT", "120")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.HelmTimeout != 2*time.Minute {
		t.Errorf("HelmTimeout = %v, want 2m", c.HelmTimeout)
	}
}
