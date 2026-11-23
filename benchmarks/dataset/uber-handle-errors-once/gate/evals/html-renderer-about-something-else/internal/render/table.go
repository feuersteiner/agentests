// Package render writes the stock report as an HTML table.
package render

import (
	"fmt"
	"html"
	"io"
	"log/slog"
	"strings"
)

// Row is one line of the stock report.
type Row struct {
	SKU   string
	Name  string
	Stock int
}

// Table writes rows to w as an HTML table and returns the first write error.
func Table(w io.Writer, rows []Row) error {
	var b strings.Builder
	b.WriteString("<table>\n<tr><th>SKU</th><th>Name</th><th>Stock</th></tr>\n")
	for _, row := range rows {
		class := ""
		if row.Stock == 0 {
			class = ` class="out"`
		}
		fmt.Fprintf(&b, "<tr%s><td>%s</td><td>%s</td><td>%d</td></tr>\n",
			class, html.EscapeString(row.SKU), html.EscapeString(row.Name), row.Stock)
	}
	b.WriteString("</table>\n")
	slog.Debug("rendered stock report", "rows", len(rows), "bytes", b.Len())
	if _, err := io.WriteString(w, b.String()); err != nil {
		return fmt.Errorf("write stock report: %w", err)
	}
	return nil
}
