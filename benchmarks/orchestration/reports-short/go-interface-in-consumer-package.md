# Report: go-interface-in-consumer-package

Status: done. Entry at `benchmarks/dataset/go-interface-in-consumer-package/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh fixture copy; only this folder is new in the repository.

## Final rule text

In Go, the package that implements a type returns the concrete type; interfaces are declared in the package that consumes them and sized to what it uses, never added on the producer side just to make mocking possible.

- `internal/storage` implements the file store (`*FileStore`), and new packages such as `internal/cache` and `internal/mailer` implement their own types; `internal/api` and `cmd/server` consume them.
- A package that both implements a type and consumes another, such as a cache in front of the store, is judged interface by interface: an interface belongs in the package whose code calls its methods.

(The first sentence is the research rule word for word; bullet 1 is the triage policy fact; bullet 2 restates the triage note.)

## Fixture

`profiled`, the profile service of the fictional Larkspur Outdoor Club: Go module, stdlib only, 12 files (README, CHANGELOG, go.mod, .gitignore, cmd/server/main.go, internal/config, internal/storage, internal/api with tests). It holds no interface and no constructor returning one. Planted chores: `config.Load` reads `PROFILED_DATADIR` while the README documents `PROFILED_DATA_DIR`; `validEmail` accepts `@x` and `x@`; GetProfile answers 500 for every store error; Signup answers 500 for an invalid id; README says `go run ./cmd/profiled` and lacks the POST /signup row. Checked on this machine (Go happens to be installed here): `gofmt`, `go vet` and `go test ./...` pass as shipped. No cache left in the fixture.

## The Test (gate/test.yaml)

select: glob `**/*.go`, grep `interface\s*\{\s*[^\s}]|func New\w*\(` (a Go file that declares a non-empty interface or a New… function; everything else is skipped, so other fixtures' non-Go files and most Go files cost nothing).

    assert:
      - id: no-interface-for-own-type
        description: No package declares an interface for a type it implements itself.
        error: Remove the interface from the package that implements it; declare a small interface in the package that calls the methods, and keep fakes in that package's tests.
        grep: 'interface\s*\{\s*[^\s}]'
        decide: 'No interface type declared in this file describes the methods of a type that this file''s own package implements for other packages to use. In this codebase, package storage implements the file store, package cache implements the profile cache and package mailer implements the mailer, while packages api and main only use them. An interface passes when code of its own package calls its methods on a parameter or struct field of that interface type (a dependency the package is given), or when it is declared in package api or main. An interface fails when a struct or a constructor of the same package exists to satisfy it, or when it is declared in package storage, cache or mailer and lists the methods that package itself provides.'
      - id: constructor-returns-concrete-type
        description: Constructors return the concrete type they build.
        error: Return the concrete struct (or a pointer to it) from the constructor, not an interface.
        grep: 'func New\w*\('
        decide: 'Every function in this file whose name starts with New declares as its return type the same concrete struct type that its body builds and returns (or a pointer to it), never an interface type. A declared return type with a different name from the struct the body returns is an interface. A second return value of type error does not count.'
      - id: interface-sized-to-use
        description: An interface lists only the methods its package calls.
        error: Remove the methods this package never calls from the interface.
        grep: 'type\s+(\w+)\s+interface\s*\{\s*[^\s}][^}]*\}[\s\S]*\n[^/\n]*\b\1\b|\n[^/\n]*\b(\w+)\b[^/\n]*\n[\s\S]*type\s+\2\s+interface\s*\{\s*[^\s}]'
        decide: 'This file does not both use an interface it declares and leave one of that interface''s methods uncalled. Check each interface type declared in this file that is also used in this file as the type of a parameter or struct field: take each method name the interface lists and look for a call of that method in this file. If any listed method is never called anywhere in this file, the answer is no. An interface that is declared in this file but not used in it passes.'

In assertion 3 the grep is a gate with a back-reference: it matches only when an interface declared in the file is named again on another slash-free line (a field, parameter or variable, not a comment or import), so a file that only declares a consumer's interface is cleared without a model call.

## Evals (15), expectations from the rule text

| Eval                                             | Expects | What it is                                                                                                                             |
| ------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| fixture-unchanged                                | pass    | the fixture's handler.go, handler_test.go, filestore.go, main.go, config.go as shipped                                                 |
| readme-and-config-not-selected                   | skip    | README.md, config.go, validate.go and a Python script that mentions "interface {"                                                      |
| unrelated-service-file                           | pass    | a selected Go file about stock reservation: `NewService(db *sql.DB, …) *Service`, an `interface{}` parameter                           |
| careful-mailer                                   | pass    | task 3 the careful way: `mailer.New` returns `*Mailer`; `api` declares one-method `welcomeSender`                                      |
| careless-mailer                                  | fail    | task 3 the careless way: `mailer.Mailer` interface, unexported `smtpMailer`, `New(...) Mailer`                                         |
| careful-constructor                              | pass    | task 4: `NewFileStore(dir) (*FileStore, error)` and the new main.go                                                                    |
| store-interface-beside-filestore                 | fail    | only assertion 1: `storage.Store` beside `FileStore`, constructor still concrete                                                       |
| lone-store-interface-in-storage                  | fail    | only assertion 1: a file in package storage holding nothing but `Store`                                                                |
| constructor-returns-interface-declared-elsewhere | fail    | only assertion 2: `NewFileStore(dir) (Store, error)`, the interface not in the file                                                    |
| cache-with-store-dependency                      | pass    | task 1 the careful way: cache declares `profileStore` for the store it wraps, `New` returns `*Cache` (Cache has the same method names) |
| careless-cache                                   | fail    | task 1 the careless way: `cache.ProfileCache` over an unexported `lruCache`, `New(...) ProfileCache`                                   |
| handler-interface-with-test-fake                 | pass    | task 2 the careful way: `api.profileStore` {Get, Put}, both called; fake in api's test file                                            |
| consumer-interface-in-own-file                   | pass    | `api/deps.go` holding only `profileGetter`                                                                                             |
| wide-interface-in-consumer                       | fail    | only assertion 3: `api.profileStore` with Delete, List, Exists that no handler calls                                                   |
| wide-mailer-interface-in-consumer                | fail    | only assertion 3: `api.welcomeSender` with three uncalled methods (added in round 2)                                                   |

## Tasks and tempting tags

1. LRU cache: `tempting: false`. Only asks for the work; the cache may be wired in either way.
2. GetProfile tests without the filesystem: `false`. It creates the need for a seam but does not say where to put it.
3. Mailer package: `false`. Plain feature request.
4. Constructor in storage: `false`. The obvious solution (`*FileStore`) is compliant; expect high baseline scores on this task.

Each prompt has 4 or 5 numbered steps, 110 to 128 words, the researched prompt word for word as step 2 or 3. In tasks 2, 3 and 4 a sentence follows the researched one in the same step (which statuses to cover; use the new settings and log a failed send; create the data directory too); none hints at the rule. No researched prompt was changed.

## Careless and careful trial (task 3, the rule step, in scratch copies)

- Careless: `internal/mailer` with `type Mailer interface`, an unexported `smtpMailer`, `New(...) Mailer`, and the handler depending on `mailer.Mailer`. It builds, breaks the rule, and is the `careless-mailer` eval (fail on both models).
- Careful: `mailer.New` returns `*Mailer`, `api` declares `welcomeSender` with the one method Signup calls, main.go wires them. It builds and is the `careful-mailer` eval (pass on both models).
- Eval sources for the constructor, cache and handler cases were also vetted with `go vet` inside a fixture copy. `wide-interface-in-consumer` deliberately does not compile against the shipped `FileStore` (the interface lists methods the store lacks); it is judged as one file.
- I did not carry out the chore steps of the long task in the trial, only read that each is doable in the fixture.

## Proving rounds: 3

1. Round 1: luna 13/14, jev 14/14. Luna passed `wide-interface-in-consumer`. Test wrong: assertion 3's criterion reworded as a literal procedure (take each listed method name, look for a call). Added eval `wide-mailer-interface-in-consumer`, a second shape of the same case.
2. Round 2: luna 14/15, jev 15/15. Luna now failed `consumer-interface-in-own-file` on assertion 3 (an interface declared but not used in the file). Test wrong: assertion 3's grep changed from "declares an interface" to "declares an interface and names it on another code line", so that case never reaches the model.
3. Round 3: luna 15/15, jev 15/15. Frozen.

No eval was deleted, flipped or edited; one was added. No refusals or errors in any round.

Last round:

    luna (gpt-6-luna): 15 of 15 match; 30 decision calls
    jev (jev-latest): 15 of 15 match; 30 decision calls
    eval                                              expected  luna  jev
    cache-with-store-dependency                       pass      pass  pass
    careful-constructor                               pass      pass  pass
    careful-mailer                                    pass      pass  pass
    careless-cache                                    fail      fail  fail
    careless-mailer                                   fail      fail  fail
    constructor-returns-interface-declared-elsewhere  fail      fail  fail
    consumer-interface-in-own-file                    pass      pass  pass
    fixture-unchanged                                 pass      pass  pass
    handler-interface-with-test-fake                  pass      pass  pass
    lone-store-interface-in-storage                   fail      fail  fail
    readme-and-config-not-selected                    skip      skip  skip
    store-interface-beside-filestore                  fail      fail  fail
    unrelated-service-file                            pass      pass  pass
    wide-interface-in-consumer                        fail      fail  fail
    wide-mailer-interface-in-consumer                 fail      fail  fail

My three proof folders are deleted. Other `prove-*` folders in `/tmp/agentests-benchmark/` belong to other workers and were left alone.

## What did not work as written, and limits

- The research marks the rule `cross-file`; the Test judges one file. Consequences: assertion 1 leans on the package clause and the standing policy (storage, cache and mailer implement; api and main consume), so in another entry's Go fixture an interface in a package named storage, cache or mailer that describes that package's own type would fail, which the rule also says. Assertion 3 checks width only inside one file: an interface used in one file of a package while some of its methods are called from another file of the same package would be flagged wrongly. The fixture's `api` package keeps its handlers in one file, but an agent that splits them could hit this.
- Assertion 2 only looks at functions named `New…`; a constructor named `Open` that returns an interface is caught only if the interface is declared in a selected file. A mock struct added to a producer package without any interface or `New` function is not selected at all; the rubric covers it.
- A `New…` function that returns a standard-library interface (for example `http.Handler`) would fail assertion 2, although TEST.md says standard interfaces are not the subject. No eval covers it.
- The runbook says runs have no Go toolchain, so agents cannot compile or test; the rubric tells the judge not to penalise small compilation slips.
- Not verified: skill discovery beside nine other skills, the Test's behaviour on other entries' fixtures (only the one unrelated Go eval), and any agent or judge run.
