// Package httpapi serves stockroom over HTTP.
package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"pelham.example/stockroom/internal/money"
	"pelham.example/stockroom/internal/service"
	"pelham.example/stockroom/internal/store"
)

// API holds what the handlers need.
type API struct {
	svc *service.Service
	log *slog.Logger
}

// New returns the API on top of svc.
func New(svc *service.Service, log *slog.Logger) *API {
	return &API{svc: svc, log: log}
}

// Routes returns the handler for every endpoint.
func (a *API) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /products", a.listProducts)
	mux.HandleFunc("POST /orders", a.createOrder)
	mux.HandleFunc("GET /warehouses", a.listWarehouses)
	return mux
}

type productResponse struct {
	SKU   string `json:"sku"`
	Name  string `json:"name"`
	Price string `json:"price"`
	Stock int    `json:"stock"`
}

func (a *API) listProducts(w http.ResponseWriter, r *http.Request) {
	products, err := a.svc.ListProducts(r.Context())
	if err != nil {
		a.fail(w, r, err)
		return
	}
	response := make([]productResponse, 0, len(products))
	for _, p := range products {
		response = append(response, productResponse{
			SKU:   p.SKU,
			Name:  p.Name,
			Price: money.Format(p.PriceCents),
			Stock: p.Stock,
		})
	}
	a.respond(w, http.StatusOK, response)
}

type orderRequest struct {
	SKU      string `json:"sku"`
	Quantity int    `json:"quantity"`
}

type orderResponse struct {
	ID    string `json:"id"`
	Total string `json:"total"`
}

func (a *API) createOrder(w http.ResponseWriter, r *http.Request) {
	var request orderRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		a.respond(w, http.StatusBadRequest, map[string]string{"error": "the body is not valid JSON"})
		return
	}
	order, err := a.svc.CreateOrder(r.Context(), request.SKU, request.Quantity)
	if err != nil {
		a.fail(w, r, err)
		return
	}
	a.respond(w, http.StatusCreated, orderResponse{ID: order.ID, Total: money.Format(order.TotalCents)})
}

// fail ends a request that hit an error: it picks the status, logs the error when it is the
// server's fault and tells the client.
func (a *API) fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		a.respond(w, http.StatusNotFound, map[string]string{"error": "no such product"})
	case errors.Is(err, service.ErrInvalidQuantity):
		a.respond(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		a.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "err", err)
		a.respond(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}
}

func (a *API) respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		a.log.Warn("could not write the response", "err", err)
	}
}

func (a *API) listWarehouses(w http.ResponseWriter, r *http.Request) {
	warehouses, err := a.svc.Warehouses(r.Context())
	if err != nil {
		a.log.Error("could not list the warehouses", "err", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	a.respond(w, http.StatusOK, warehouses)
}
