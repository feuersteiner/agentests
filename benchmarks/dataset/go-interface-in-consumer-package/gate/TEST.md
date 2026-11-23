# Interfaces live in the package that uses them

The Go code of the profile service keeps its interfaces on the consumer's side:

In Go, the package that implements a type returns the concrete type; interfaces are declared in the package that consumes them and sized to what it uses, never added on the producer side just to make mocking possible.

- `internal/storage` implements the file store (`*FileStore`), and new packages such as `internal/cache` and `internal/mailer` implement their own types; `internal/api` and `cmd/server` consume them.
- A package that both implements a type and consumes another, such as a cache in front of the store, is judged interface by interface: an interface belongs in the package whose code calls its methods.

Test files count too: a fake or mock for a consumer's tests lives beside those tests, in the
consumer's package. Interfaces from the standard library, such as `error`, `io.Reader` and
`http.Handler`, are not what this rule is about, and neither are type-parameter constraints.
