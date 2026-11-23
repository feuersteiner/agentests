// Package cache keeps recently used profiles in memory, in front of the store.
package cache

import (
	"container/list"
	"context"
	"sync"

	"larkspur.example/profiled/internal/storage"
)

// ProfileCache is a cache of profiles. Handlers depend on it so it can be mocked.
type ProfileCache interface {
	Get(ctx context.Context, id string) (storage.Profile, error)
	Put(ctx context.Context, profile storage.Profile) error
}

type lruCache struct {
	store    *storage.FileStore
	capacity int

	mu    sync.Mutex
	order *list.List
	items map[string]*list.Element
}

// New returns a ProfileCache that keeps at most capacity profiles in front of store.
func New(store *storage.FileStore, capacity int) ProfileCache {
	return &lruCache{store: store, capacity: capacity, order: list.New(), items: make(map[string]*list.Element)}
}

type entry struct {
	id      string
	profile storage.Profile
}

// Get returns the profile from the cache, loading it from the store on a miss.
func (c *lruCache) Get(ctx context.Context, id string) (storage.Profile, error) {
	c.mu.Lock()
	if element, ok := c.items[id]; ok {
		c.order.MoveToFront(element)
		profile := element.Value.(*entry).profile
		c.mu.Unlock()
		return profile, nil
	}
	c.mu.Unlock()

	profile, err := c.store.Get(ctx, id)
	if err != nil {
		return storage.Profile{}, err
	}
	c.add(profile)
	return profile, nil
}

// Put writes the profile to the store and refreshes the cached copy.
func (c *lruCache) Put(ctx context.Context, profile storage.Profile) error {
	if err := c.store.Put(ctx, profile); err != nil {
		return err
	}
	c.add(profile)
	return nil
}

func (c *lruCache) add(profile storage.Profile) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if element, ok := c.items[profile.ID]; ok {
		element.Value.(*entry).profile = profile
		c.order.MoveToFront(element)
		return
	}
	c.items[profile.ID] = c.order.PushFront(&entry{id: profile.ID, profile: profile})
	if c.order.Len() > c.capacity {
		oldest := c.order.Back()
		c.order.Remove(oldest)
		delete(c.items, oldest.Value.(*entry).id)
	}
}
