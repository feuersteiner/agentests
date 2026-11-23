package storage

import "context"

// Store is implemented by FileStore. Handlers depend on it so that tests can swap in a mock.
type Store interface {
	Get(ctx context.Context, id string) (Profile, error)
	Put(ctx context.Context, profile Profile) error
}
