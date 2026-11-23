// Package db holds Tidegate's documents and their import.
package db

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseRevID splits a revision id such as "3-9f2c" into its generation and digest.
func ParseRevID(rev string) (generation int, digest string, err error) {
	before, after, found := strings.Cut(rev, "-")
	if !found || after == "" {
		return 0, "", fmt.Errorf("db: malformed revision id %q", rev)
	}
	generation, err = strconv.Atoi(before)
	if err != nil || generation < 1 {
		return 0, "", fmt.Errorf("db: malformed revision id %q", rev)
	}
	return generation, after, nil
}

// CompareRevIDs orders two revision ids: negative when a is older than b, positive when it is
// newer, zero when they are the same. The higher generation wins, then the higher digest.
func CompareRevIDs(a, b string) int {
	genA, digestA, _ := strings.Cut(a, "-")
	genB, digestB, _ := strings.Cut(b, "-")
	if genA != genB {
		return strings.Compare(genA, genB)
	}
	return strings.Compare(digestA, digestB)
}
