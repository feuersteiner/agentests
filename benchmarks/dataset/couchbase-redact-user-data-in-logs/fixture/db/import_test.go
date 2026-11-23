package db

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"tidegate/base"
)

type memoryStore struct {
	docs    map[string]Document
	failFor string
}

func (m *memoryStore) Put(_ context.Context, doc Document) error {
	if doc.ID == m.failFor {
		return errors.New("bucket unavailable")
	}
	m.docs[doc.ID] = doc
	return nil
}

func TestImportBatch(t *testing.T) {
	base.SetLogOutput(io.Discard)
	store := &memoryStore{docs: map[string]Document{}, failFor: "order:17"}
	importer := &Importer{DBName: "field-notes", Store: store, MaxDocSize: 64}

	stats := importer.ImportBatch(context.Background(), []Document{
		{ID: "order:16", Rev: "1-a", Body: map[string]any{"total": 12}},
		{ID: "order:17", Rev: "1-b", Body: map[string]any{"total": 30}},
		{ID: "", Rev: "1-c"},
		{ID: "_sync:seq", Rev: "1-d"},
		{ID: "order:18", Deleted: true},
		{ID: "order:19", Rev: "1-e", Body: map[string]any{"note": strings.Repeat("x", 100)}},
	})

	if stats.Imported != 1 || stats.Failed != 1 {
		t.Fatalf("got %+v, want 1 imported and 1 failed", stats)
	}
	if _, ok := store.docs["order:16"]; !ok || len(store.docs) != 1 {
		t.Fatalf("stored %v, want only order:16", store.docs)
	}
}
