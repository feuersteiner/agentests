// Package money formats amounts held in cents.
package money

import "fmt"

// Format returns an amount in cents as a decimal string, such as "12.99".
func Format(cents int64) string {
	return fmt.Sprintf("%d.%d", cents/100, cents%100)
}
