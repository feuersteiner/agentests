// Package pricing asks the pricing service for current prices.
package pricing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
)

// ErrUnavailable is returned when the pricing service cannot give a price.
var ErrUnavailable = errors.New("pricing service unavailable")

// Client talks to the pricing service.
type Client struct {
	baseURL string
	http    *http.Client
	log     *slog.Logger
}

// NewClient returns a client for the pricing service at baseURL.
func NewClient(baseURL string, httpClient *http.Client, log *slog.Logger) *Client {
	return &Client{baseURL: baseURL, http: httpClient, log: log}
}

type priceResponse struct {
	SKU        string `json:"sku"`
	PriceCents int64  `json:"price_cents"`
}

// CurrentPrice returns the current price of a product in cents.
func (c *Client) CurrentPrice(ctx context.Context, sku string) (int64, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/prices/"+url.PathEscape(sku), nil)
	if err != nil {
		return 0, fmt.Errorf("build price request for %q: %w", sku, err)
	}
	response, err := c.http.Do(request)
	if err != nil {
		return 0, fmt.Errorf("request price of %q: %w: %w", sku, ErrUnavailable, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("price of %q: status %d: %w", sku, response.StatusCode, ErrUnavailable)
	}
	var body priceResponse
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return 0, fmt.Errorf("decode price of %q: %w", sku, err)
	}
	c.log.Debug("fetched price", "sku", sku, "price_cents", body.PriceCents)
	return body.PriceCents, nil
}

// PriceOr returns the current price of a product, or fallback when the pricing service cannot
// give one.
func (c *Client) PriceOr(ctx context.Context, sku string, fallback int64) int64 {
	price, err := c.CurrentPrice(ctx, sku)
	if err != nil {
		c.log.Warn("using the catalogue price; the pricing service gave none", "sku", sku, "err", err)
		return fallback
	}
	return price
}
