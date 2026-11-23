package api

import "strings"

// validEmail reports whether s looks like an email address: one @ with text on both sides.
func validEmail(s string) bool {
	return strings.Count(s, "@") == 1 && !strings.ContainsAny(s, " \t\n")
}
