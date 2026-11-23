package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// OIDCProvider is one configured OpenID Connect identity provider.
type OIDCProvider struct {
	Name          string
	Issuer        string
	ClientID      string
	ClientSecret  string
	TokenEndpoint string
	CallbackURL   string

	// Client makes the requests; http.DefaultClient when nil.
	Client *http.Client
}

// TokenResponse is the provider's answer to a successful token exchange.
type TokenResponse struct {
	IDToken      string `json:"id_token"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// ErrTokenExchange is returned when the provider does not hand out tokens.
var ErrTokenExchange = errors.New("auth: OIDC token exchange failed")

// Validate reports what is missing from the provider's configuration.
func (p *OIDCProvider) Validate() error {
	if p.Name == "" {
		return errors.New("auth: OIDC provider needs a name")
	}
	if !strings.HasPrefix(p.Issuer, "https://") {
		return errors.New("auth: OIDC issuer must be an https URL")
	}
	if p.ClientID == "" {
		return errors.New("auth: OIDC provider needs a client_id")
	}
	return nil
}

// ExchangeCode trades an authorization code for tokens at the provider's token endpoint.
func (p *OIDCProvider) ExchangeCode(ctx context.Context, code string) (*TokenResponse, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {p.CallbackURL},
		"client_id":     {p.ClientID},
		"client_secret": {p.ClientSecret},
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, p.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := p.Client
	if client == nil {
		client = http.DefaultClient
	}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrTokenExchange, err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrTokenExchange, err)
	}
	if response.StatusCode != http.StatusOK {
		return nil, ErrTokenExchange
	}
	var tokens TokenResponse
	if err := json.Unmarshal(body, &tokens); err != nil {
		return nil, fmt.Errorf("%w: unreadable answer", ErrTokenExchange)
	}
	return &tokens, nil
}
