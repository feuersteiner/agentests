package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestProvider(endpoint string) *OIDCProvider {
	return &OIDCProvider{
		Name:          "harbour-id",
		Issuer:        "https://id.harbourline.example",
		ClientID:      "tidegate",
		ClientSecret:  "not-a-real-secret",
		TokenEndpoint: endpoint,
		CallbackURL:   "https://sync.harbourline.example/_oidc_callback",
	}
}

func TestExchangeCodeReturnsTokens(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id_token":"id.jwt","access_token":"at","expires_in":3600}`))
	}))
	defer server.Close()

	tokens, err := newTestProvider(server.URL).ExchangeCode(context.Background(), "code-1")
	if err != nil {
		t.Fatalf("ExchangeCode: %v", err)
	}
	if tokens.IDToken != "id.jwt" || tokens.ExpiresIn != 3600 {
		t.Fatalf("got %+v", tokens)
	}
}

func TestExchangeCodeFailsOnProviderError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_client","error_description":"Client authentication failed"}`))
	}))
	defer server.Close()

	if _, err := newTestProvider(server.URL).ExchangeCode(context.Background(), "code-1"); !errors.Is(err, ErrTokenExchange) {
		t.Fatalf("got %v, want ErrTokenExchange", err)
	}
}

func TestValidate(t *testing.T) {
	provider := newTestProvider("https://id.harbourline.example/token")
	if err := provider.Validate(); err != nil {
		t.Fatalf("Validate: %v", err)
	}
	provider.Issuer = "http://id.harbourline.example"
	if err := provider.Validate(); err == nil {
		t.Fatal("an http issuer was accepted")
	}
}
