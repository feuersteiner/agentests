package main

import (
	"log/slog"
	"os"
)

func readSeed(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		slog.Error("failed to read the seed file", "err", err)
		return nil, err
	}
	return data, nil
}

func main() {
	if _, err := readSeed("seed.json"); err != nil {
		os.Exit(1)
	}
}
