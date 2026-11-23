// Package base holds what every Tidegate package shares.
package base

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// LogLevel orders the log levels from quietest to loudest.
type LogLevel int

const (
	LevelWarn LogLevel = iota
	LevelInfo
	LevelDebug
)

var (
	logMu     sync.Mutex
	logOut    io.Writer = os.Stderr
	logLevel            = LevelInfo
	redaction bool
)

// SetLogOutput sends log lines to w.
func SetLogOutput(w io.Writer) {
	logMu.Lock()
	defer logMu.Unlock()
	logOut = w
}

// SetLogLevel sets the loudest level that is written.
func SetLogLevel(level LogLevel) {
	logMu.Lock()
	defer logMu.Unlock()
	logLevel = level
}

// SetRedaction turns redaction of tagged values on or off.
func SetRedaction(on bool) {
	logMu.Lock()
	defer logMu.Unlock()
	redaction = on
}

type correlationKey struct{}

// WithCorrelationID returns a context whose log lines carry id.
func WithCorrelationID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, correlationKey{}, id)
}

type userData struct{ value any }

// UD tags v as user data. It is written as <ud>v</ud>, or as <ud>hash</ud> when redaction is on.
func UD(v any) fmt.Stringer { return userData{v} }

func (u userData) String() string {
	text := fmt.Sprint(u.value)
	logMu.Lock()
	on := redaction
	logMu.Unlock()
	if on {
		sum := sha1.Sum([]byte(text))
		text = hex.EncodeToString(sum[:8])
	}
	return "<ud>" + text + "</ud>"
}

type metadata struct{ value any }

// MD tags v as metadata. It is written as <md>v</md>.
func MD(v any) fmt.Stringer { return metadata{v} }

func (m metadata) String() string { return "<md>" + fmt.Sprint(m.value) + "</md>" }

// WarnfCtx logs at warning level.
func WarnfCtx(ctx context.Context, format string, args ...any) {
	logf(ctx, LevelWarn, "WRN", format, args...)
}

// InfofCtx logs at info level.
func InfofCtx(ctx context.Context, format string, args ...any) {
	logf(ctx, LevelInfo, "INF", format, args...)
}

// DebugfCtx logs at debug level.
func DebugfCtx(ctx context.Context, format string, args ...any) {
	logf(ctx, LevelDebug, "DBG", format, args...)
}

func logf(ctx context.Context, level LogLevel, name, format string, args ...any) {
	message := fmt.Sprintf(format, args...)
	logMu.Lock()
	defer logMu.Unlock()
	if level > logLevel {
		return
	}
	prefix := time.Now().UTC().Format(time.RFC3339) + " [" + name + "] "
	if id, ok := ctx.Value(correlationKey{}).(string); ok {
		prefix += "c:" + id + " "
	}
	fmt.Fprintln(logOut, prefix+message)
}
