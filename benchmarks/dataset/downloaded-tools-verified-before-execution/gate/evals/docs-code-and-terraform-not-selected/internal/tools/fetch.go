// Package tools downloads helper binaries at start-up.
package tools

import (
	"io"
	"net/http"
	"os"
)

// FetchHelm downloads the latest helm build to path.
func FetchHelm(path string) error {
	resp, err := http.Get("https://get.helm.sh/helm-latest-linux-amd64.tar.gz")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}
