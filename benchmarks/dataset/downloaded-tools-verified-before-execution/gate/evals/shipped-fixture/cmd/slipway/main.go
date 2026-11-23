// Command slipway serves the preview-environment API.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"

	"github.com/saltmarsh/slipway/internal/config"
	"github.com/saltmarsh/slipway/internal/release"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	settings := release.Settings{Chart: cfg.Chart, Namespace: cfg.Namespace, Timeout: cfg.HelmTimeout}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "ok")
	})
	mux.HandleFunc("POST /previews", func(w http.ResponseWriter, r *http.Request) {
		var p release.Preview
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || p.Tag == "" {
			http.Error(w, "expected {\"branch\": ..., \"tag\": ...}", http.StatusBadRequest)
			return
		}
		name, err := release.Name(p.Branch)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		go installPreview(name, p.Tag, settings)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]string{"release": name})
	})

	log.Printf("slipway listening on %s", cfg.Addr)
	log.Fatal(http.ListenAndServe(cfg.Addr, mux))
}

// installPreview runs helm for one preview and logs the outcome.
func installPreview(name, tag string, s release.Settings) {
	ctx, cancel := context.WithTimeout(context.Background(), s.Timeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, "helm", release.HelmArgs(name, tag, s)...).CombinedOutput()
	if err != nil {
		log.Printf("preview %s: helm failed: %v\n%s", name, err, out)
		return
	}
	log.Printf("preview %s: installed tag %s", name, tag)
}
