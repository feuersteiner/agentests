package db

import (
	"context"
	"time"

	"tidegate/base"
)

// RevStore is where old revisions are kept until compaction removes them.
type RevStore interface {
	PurgeBefore(ctx context.Context, cutoff time.Time) (int, error)
}

// Compact removes revisions older than keep and reports how many went.
func Compact(ctx context.Context, store RevStore, keep time.Duration) (int, error) {
	started := time.Now()
	removed, err := store.PurgeBefore(ctx, started.Add(-keep))
	if err != nil {
		base.WarnfCtx(ctx, "Compaction stopped after %d revisions: %v", removed, err)
		return removed, err
	}
	base.InfofCtx(ctx, "Compaction removed %d revisions in %s", removed, time.Since(started))
	return removed, nil
}
