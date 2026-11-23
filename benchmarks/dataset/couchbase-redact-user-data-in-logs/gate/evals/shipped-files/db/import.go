package db

import (
	"context"
	"encoding/json"
	"strings"

	"tidegate/base"
)

// DefaultMaxDocSize is the largest document body, in bytes, the import takes.
const DefaultMaxDocSize = 1 << 20

// Document is one document as a back-office tool wrote it to the bucket.
type Document struct {
	ID      string
	Rev     string
	Deleted bool
	Body    map[string]any
}

// Store is where imported documents go.
type Store interface {
	Put(ctx context.Context, doc Document) error
}

// ImportStats counts what one batch did.
type ImportStats struct {
	Imported int
	Failed   int
}

// Importer brings documents written outside the gateway into the database DBName.
type Importer struct {
	DBName     string
	Store      Store
	MaxDocSize int
}

// ImportBatch imports docs one by one. It leaves out documents the apps must not sync: those
// without an id, the gateway's own "_sync:" documents, tombstones that have no revision, and
// documents whose body is larger than MaxDocSize.
func (i *Importer) ImportBatch(ctx context.Context, docs []Document) ImportStats {
	maxSize := i.MaxDocSize
	if maxSize == 0 {
		maxSize = DefaultMaxDocSize
	}
	var stats ImportStats
	for _, doc := range docs {
		if doc.ID == "" {
			continue
		}
		if strings.HasPrefix(doc.ID, "_sync:") {
			continue
		}
		if doc.Deleted && doc.Rev == "" {
			continue
		}
		body, err := json.Marshal(doc.Body)
		if err != nil || len(body) > maxSize {
			continue
		}
		if err := i.Store.Put(ctx, doc); err != nil {
			base.WarnfCtx(ctx, "Import of doc %s into %s failed: %v", base.UD(doc.ID), base.MD(i.DBName), err)
			stats.Failed++
			continue
		}
		stats.Imported++
	}
	base.InfofCtx(ctx, "Imported %d of %d documents into %s", stats.Imported, len(docs), base.MD(i.DBName))
	return stats
}
