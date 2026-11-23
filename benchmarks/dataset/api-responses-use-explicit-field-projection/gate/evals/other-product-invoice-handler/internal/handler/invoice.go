// Package handler holds the HTTP handlers of ledgerline, Harbor & Hythe's invoicing service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"harborhythe.example/ledgerline/internal/billing"
)

type invoiceResponse struct {
	Number        string    `json:"number"`
	CustomerName  string    `json:"customer_name"`
	CustomerEmail string    `json:"customer_email"`
	TotalCents    int64     `json:"total_cents"`
	Currency      string    `json:"currency"`
	DueAt         time.Time `json:"due_at"`
	Paid          bool      `json:"paid"`
}

// GetInvoice returns one of the signed-in account's invoices. The router mounts it behind the
// account session middleware, which puts the account id in the request context.
func (h *Handler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	accountID := billing.AccountFrom(r.Context())
	inv, err := h.billing.Invoice(r.Context(), accountID, r.PathValue("number"))
	if errors.Is(err, billing.ErrNoInvoice) {
		http.Error(w, "no such invoice", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "could not load the invoice", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invoiceResponse{
		Number:        inv.Number,
		CustomerName:  inv.Customer.Name,
		CustomerEmail: inv.Customer.Email,
		TotalCents:    inv.TotalCents,
		Currency:      inv.Currency,
		DueAt:         inv.DueAt,
		Paid:          inv.PaidAt != nil,
	})
}
