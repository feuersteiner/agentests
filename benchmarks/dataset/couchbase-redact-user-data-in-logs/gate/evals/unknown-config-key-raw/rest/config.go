package rest

import (
	"context"

	"tidegate/base"
)

var knownKeys = map[string]bool{"session_ttl": true, "max_failed_logins": true, "import_max_doc_size": true}

// CheckConfigKeys warns about every key of a database's config that the gateway does not know.
func CheckConfigKeys(ctx context.Context, config map[string]any) int {
	unknown := 0
	for key := range config {
		if !knownKeys[key] {
			base.WarnfCtx(ctx, "Ignoring unknown config key %s", key)
			unknown++
		}
	}
	return unknown
}
