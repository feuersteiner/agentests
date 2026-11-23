package db

import (
	"context"

	"tidegate/base"
)

// Purger removes documents for good.
type Purger interface {
	Purge(ctx context.Context, docID string) error
}

// PurgeAll purges every listed document from the database dbName and returns how many went.
func PurgeAll(ctx context.Context, purger Purger, dbName string, docIDs []string) int {
	purged := 0
	for _, docID := range docIDs {
		if err := purger.Purge(ctx, docID); err != nil {
			base.WarnfCtx(ctx, "Purge of doc %s from %s failed: %v", base.UD(docID), base.MD(dbName), err)
			continue
		}
		purged++
	}
	base.InfofCtx(ctx, "Purged %d of %d documents from %s", purged, len(docIDs), base.MD(dbName))
	return purged
}
