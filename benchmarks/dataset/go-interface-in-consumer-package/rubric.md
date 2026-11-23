# Rubric: Go interfaces belong to the consumer

## The rule

In Go, the package that implements a type returns the concrete type; interfaces are declared in the package that consumes them and sized to what it uses, never added on the producer side just to make mocking possible.

- `internal/storage` implements the file store (`*FileStore`), and new packages such as `internal/cache` and `internal/mailer` implement their own types; `internal/api` and `cmd/server` consume them.
- A package that both implements a type and consumes another, such as a cache in front of the store, is judged interface by interface: an interface belongs in the package whose code calls its methods.

## What to look at

The repository starts with no interface of its own: `storage.FileStore` is a concrete struct and
`api.NewHandler` takes a `*storage.FileStore`. Read every Go file the diff adds or changes, tests
included, and for each interface type and each constructor ask:

1. **Where is the interface declared, and who calls its methods?** It is in the right place when
   code of its own package calls its methods on a value it is handed (a parameter or a struct
   field). It is in the wrong place when it sits in the package that implements those methods, for
   others to depend on or mock: `storage.Store` beside `FileStore`, `mailer.Mailer` beside the SMTP
   type, `cache.Cache` describing the cache's own methods. A cache package may declare a small
   interface for the store it wraps, since the cache is the caller there.
2. **What do constructors return?** `NewFileStore`, `cache.New`, `mailer.New` and the like return
   the concrete type (usually a pointer to a struct), never an interface, wherever the interface
   is declared. An unexported struct hidden behind an exported interface is the same violation.
3. **Is each interface sized to its use?** It lists only the methods its package calls. An
   interface in `api` with `Get`, `Put`, `Delete` and `List` when the handlers call two of them is
   too wide.
4. **Where do fakes and mocks live?** In the consumer's test files. A `MockStore` or `FakeMailer`
   added to a producer package so that other packages' tests can use it breaks the rule.

Adding no interface at all is fully compliant when the task did not need one. Standard library
interfaces (`error`, `io.Reader`, `http.Handler`) are not the subject. The agent has no Go
toolchain, so do not penalise small compilation slips; ignore style and naming. Then check that
every step of the prompt is done: the other steps count only toward task completion, not the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the task is attempted, but the rule is clearly broken: a producer package declares
  the interface for its own type, its constructor returns that interface, or it ships mocks.
- **4 to 6**: mixed: the producer exports an interface for its own type but constructors still
  return concrete types, or one new package follows the rule and another breaks it.
- **7 to 9**: producers return concrete types and every interface sits with its caller, with a
  minor lapse (an interface wider than its package uses) or a step of the task left undone.
- **10**: every step is done, producers return concrete types, and any interface is small and
  declared where its methods are called, with fakes in the consumer's tests.

What each looks like:

- **2**: `internal/storage` (or `cache`, or `mailer`) gains `type Store interface { Get; Put }`
  next to its struct and `NewFileStore(dir) Store` returns it; perhaps a mock sits beside it.
- **5**: `mailer.Sender` or `storage.Store` is declared in the producer package and the handler
  depends on it, but `mailer.New` and `NewFileStore` return pointers to concrete structs; or the
  cache is done properly while the store gets a producer-side interface.
- **8**: `api` declares its own interface and producers return concrete types, but the interface
  lists methods no code in `api` calls; or all is right and the changelog step is missing.
- **10**: for example, `api` declares a one- or two-method interface with exactly the store methods
  its handlers call, `NewHandler` accepts it, `storage.NewFileStore` and `cache.New` return
  `*FileStore` and `*Cache`, the test fake lives in `api`'s test file, and every step is done.
