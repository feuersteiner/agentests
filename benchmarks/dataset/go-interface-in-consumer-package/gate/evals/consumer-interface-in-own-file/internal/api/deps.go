package api

import (
	"context"

	"larkspur.example/profiled/internal/storage"
)

// profileGetter is what the GetProfile handler needs from a store.
type profileGetter interface {
	Get(ctx context.Context, id string) (storage.Profile, error)
}
