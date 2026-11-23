---
name: go-interface-in-consumer-package
description: Use whenever you write or change Go code in this repository that adds a package, a type with a constructor, an interface, or a fake or mock for tests, or that wires one internal package into another (a cache or client in front of a store, a mailer called from a handler, a handler made testable without its real dependency). Covers where a Go interface is declared, what constructors return, and where test doubles live.
---

# Go interfaces belong to the package that uses them

## The rule

In Go, the package that implements a type returns the concrete type; interfaces are declared in the package that consumes them and sized to what it uses, never added on the producer side just to make mocking possible.

- `internal/storage` implements the file store (`*FileStore`), and new packages such as `internal/cache` and `internal/mailer` implement their own types; `internal/api` and `cmd/server` consume them.
- A package that both implements a type and consumes another, such as a cache in front of the store, is judged interface by interface: an interface belongs in the package whose code calls its methods.

## Why

Go interfaces are satisfied implicitly, so the caller can describe what it needs without the
implementer knowing. An interface declared beside its only implementation is a guess about every
future caller: it grows with the type, every new method breaks every fake, and callers end up
depending on methods they never use. A constructor that returns the concrete type lets the
implementing package add methods freely, and each caller keeps a small interface that says exactly
what it calls.

## How to apply it

1. In the package that implements something, export the struct and return it from the
   constructor: `func New(...) *Thing`. Declare no interface there for the type's own methods.
2. In the package that calls it, when you need to swap the dependency (for a test, or to put
   something in front of it), declare an interface there, usually unexported, with only the
   methods that package calls. Accept that interface in the consumer's constructor or function.
3. Put fakes and mocks in the consumer's `_test.go` files, not in the implementing package.
4. `cmd/` wires concrete values together; it rarely needs an interface at all.
5. If nothing needs to swap the dependency, add no interface.

Common slips: `type Store interface` next to `type fileStore struct`; `func NewX(...) X` where
`X` is an interface "for testability"; an unexported struct hidden behind an exported interface;
a `MockX` or `FakeX` in the implementing package; an interface with every method of the type when
the caller uses one.

## Example

A `billing` package implements an invoice client and a `reports` package calls it.

Violating: the producer declares the interface and returns it.

```go
// package billing
type InvoiceClient interface {
	Fetch(ctx context.Context, id string) (Invoice, error)
	Void(ctx context.Context, id string) error
	List(ctx context.Context, customer string) ([]Invoice, error)
}

type httpClient struct{ baseURL string }

func NewClient(baseURL string) InvoiceClient { return &httpClient{baseURL: baseURL} }
```

Compliant: the producer returns its concrete type, and the consumer declares what it calls.

```go
// package billing
type Client struct{ baseURL string }

func NewClient(baseURL string) *Client { return &Client{baseURL: baseURL} }

// package reports
type invoiceLister interface {
	List(ctx context.Context, customer string) ([]billing.Invoice, error)
}

func NewMonthly(invoices invoiceLister) *Monthly { return &Monthly{invoices: invoices} }

// package reports, monthly_test.go
type fakeInvoices struct{ invoices []billing.Invoice }
```

## Before you commit

Go through the staged Go files. For each `interface` you added: is it in the package whose code
calls its methods, and does that package call every method it lists? For each constructor: does it
return the concrete type? For each fake or mock: is it in the consumer's test file? Fix what
fails and check again before you commit.
