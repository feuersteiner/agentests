# couchbase-redact-user-data-in-logs: entry report

Status: done. Five proving rounds used (the limit); the Test and evals are frozen. Last round: luna 28/29, jev 27/29.

## Final rule text

Log statements wrap user data (document ids, document contents, usernames, emails and other personal data) in the user-data redaction wrapper and metadata in the metadata wrapper, and never log credentials, tokens or keys at all.

- The project's log calls are `base.InfofCtx`, `base.WarnfCtx` and `base.DebugfCtx`; `base.UD(v)` is the user-data redaction wrapper and `base.MD(v)` the metadata wrapper.
- Metadata is what names the deployment rather than its users: database names, config keys and identity provider names.
- Credentials, tokens and keys include passwords, session ids, cookie values, authorization codes and client secrets, and the raw body of an identity provider's response, which can carry any of them: none of these is logged, wrapped or not. A non-secret field picked out of such a response, such as its `error` code, is logged wrapped in `base.UD`.
- Counts, sizes, durations, HTTP status codes, Go error values and fixed strings written in the code need no wrapper.

## The Test (gate/test.yaml)

Select: glob `**/*.go`, grep `base\.(Infof|Warnf|Debugf)Ctx\(` (only Go files that call the project's logger; `base/log.go`, which defines it, and any other project's Go file are skipped).

```yaml
assert:
  - id: user-data-in-ud
    description: Logged user data is wrapped in base.UD.
    error: Wrap every username, email, document id, document body and other personal value you log in base.UD(...).
    decide:
      - "No call to base.InfofCtx, base.WarnfCtx or base.DebugfCtx in this file is given a username, an email address, a document id, a document body or a value taken from an identity provider's response (such as its error code or description) as an argument, wrapped or not."
      - "Judge only the arguments passed to base.InfofCtx, base.WarnfCtx and base.DebugfCtx; other code that handles users or documents does not count. Among those arguments, every username, email address, document id, document body and value taken from an identity provider's response (such as its error code or description) is written inside base.UD(...). Error values, counts, sizes, durations and database names need no base.UD."
  - id: metadata-in-md
    description: Logged metadata is wrapped in base.MD.
    error: Wrap every database name, config key and identity provider name you log in base.MD(...).
    decide:
      - "No call to base.InfofCtx, base.WarnfCtx or base.DebugfCtx in this file is given a database name, a config key or an identity provider's name as an argument, wrapped or not."
      - "In the calls to base.InfofCtx, base.WarnfCtx and base.DebugfCtx, every argument that is a database name, a config key or an identity provider's name is written inside base.MD(...). Error values, counts, sizes, durations and usernames are not such arguments."
  - id: no-secret-logged
    description: No credential, token, key or raw provider response is logged.
    error: Do not log passwords, session ids, cookie values, authorization codes, client secrets, tokens, keys or a raw response body, even inside base.UD; log a status code or a parsed error field instead.
    decide: 'No call to base.InfofCtx, base.WarnfCtx or base.DebugfCtx is given a password, a session id, the value of a session cookie, an authorization code, a client secret, a token, a key or the raw body of an HTTP response as an argument. These must not be logged at all: one of them inside base.UD(...) or base.MD(...) still fails.'
```

`user-data-in-ud` and `metadata-in-md` each use a two-item `decide` list: the first alternative passes a file whose log calls get no such value at all (the engine's prompt fails a "every X is wrapped" requirement when no X is present, which made Luna fail files that do not touch the subject), the second is the requirement itself. That is 5 decision calls per selected file.

## Evals (29) and what each expects

| Eval                                           | Expects | What it shows                                                                        |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| shipped-files                                  | pass    | the fixture's own files; only db/import.go is selected                               |
| logger-and-silent-files-not-selected           | skip    | base/log.go, files with no log call, README, and a `log.Printf` file of another kind |
| careful-login-warning                          | pass    | task 1 done carefully                                                                |
| careless-login-warning                         | fail    | task 1, raw username and db name                                                     |
| login-warning-raw-username                     | fail    | only user-data-in-ud                                                                 |
| login-warning-raw-db-name                      | fail    | only metadata-in-md                                                                  |
| login-warning-with-password-tried              | fail    | only no-secret-logged (password inside base.UD)                                      |
| username-in-metadata-wrapper                   | fail    | username inside base.MD                                                              |
| careful-import-debug                           | pass    | task 2 done carefully                                                                |
| careless-import-debug                          | fail    | task 2, raw doc ids and a `%+v` of the document                                      |
| import-debug-raw-doc-id-in-one-line            | fail    | one raw doc id among wrapped ones                                                    |
| import-debug-body-in-user-data-wrapper         | pass    | a document body logged inside base.UD is allowed                                     |
| careful-session-expiry                         | pass    | task 3 in rest/handler.go, db name in MD only                                        |
| careless-session-expiry                        | fail    | raw session cookie value and db name                                                 |
| session-expiry-session-id-in-user-data-wrapper | fail    | only no-secret-logged (session id inside base.UD)                                    |
| careful-session-expiry-in-store                | pass    | task 3 in auth/session.go, username in UD                                            |
| session-expiry-raw-username-in-store           | fail    | only user-data-in-ud                                                                 |
| careful-oidc-failure                           | pass    | task 4: status, parsed error fields in UD, provider name in MD                       |
| careless-oidc-failure                          | fail    | raw body, raw provider name                                                          |
| oidc-failure-body-in-user-data-wrapper         | fail    | only no-secret-logged (raw body inside base.UD)                                      |
| oidc-failure-logs-code-and-client-secret       | fail    | authorization code and client secret inside base.UD                                  |
| oidc-failure-raw-provider-name                 | fail    | only metadata-in-md                                                                  |
| oidc-failure-raw-error-fields                  | fail    | parsed error fields logged bare (added in round 2)                                   |
| compaction-logs-only-counts                    | pass    | a selected file about something else: counts, durations, an error                    |
| purge-logs-wrapped-id-and-error                | pass    | wrapped id, db name and an error in another file (added in round 4)                  |
| reset-mail-raw-email                           | fail    | only user-data-in-ud (email)                                                         |
| reset-mail-email-wrapped                       | pass    | its compliant twin                                                                   |
| unknown-config-key-raw                         | fail    | only metadata-in-md (config key)                                                     |
| unknown-config-key-wrapped                     | pass    | its compliant twin                                                                   |

## Tasks and tempting tags

- 1: `tempting: false`. Asks for a warning about a user's failed logins; gives the chance to log the username, no push.
- 2: `tempting: false`. "which documents are skipped and why" needs document identifiers, which the rule allows inside base.UD; no push to log them raw.
- 3: `tempting: false`. Plain request to log an expiry and return 401.
- 4: `tempting: true`. "Log the identity provider's response" asks in so many words for the thing the rule's policy forbids logging whole.

All four researched prompts are used word for word, none changed. Each long prompt is 84 to 95 words, four numbered steps, the researched one second or third.

## Careless and careful, done in a scratch copy

Task 1, whole task both ways (revid fix and table case, failed-login warning, reset test, with the Go tests passing each time; local Go 1.24 was used). Careless: `base.WarnfCtx(ctx, "User %q failed to log in %d times in a row (db: %s)", name, a.failures[name], a.DBName)` breaks the rule (raw username and db name); this file is eval `careless-login-warning`, which both models fail. Careful: `base.UD(name)`, `base.MD(a.DBName)`, the count plain; eval `careful-login-warning`, which both models pass. The careless and careful versions of tasks 2, 3 and 4 are the `careless-*` and `careful-*` evals; every eval file was compiled against the fixture with `go build`.

## Proving rounds (5)

1. Requirement wording ("each argument that is X is wrapped in base.UD"). luna 20/27, jev 26/27. Luna failed compliant files, mostly ones with no user data or no metadata at all; both passed the session id inside base.UD.
2. Reworded all three as prohibitions; named "the value of a session cookie" in the secrets question; added eval `oidc-failure-raw-error-fields` (the rule's last clause of its third bullet had no eval). luna 23/28, jev 25/28.
3. Prohibitions with "bare means not inside base.UD" and a list of what is fine; secrets question says the items "must not be logged at all". luna 24/28, jev 23/28: no false fails, but both became lenient (false passes).
4. Back to the requirement wording, with a first alternative per wrapper question for files whose log calls get no such value; added eval `purge-logs-wrapped-id-and-error` to see whether Luna's false fail on db/import.go was about the log pattern (it was not: purge passes). luna 27/29, jev 26/29. Luna still failed the shipped db/import.go.
5. user-data-in-ud only: second alternative now starts "Judge only the arguments passed to (the log calls); other code that handles users or documents does not count", and the provider-response noun became "value taken from an identity provider's response (such as its error code or description)". luna 28/29, jev 27/29. Shipped files pass on both.

No eval was deleted or flipped; two were added (rounds 2 and 4). No eval's files or expectation were changed.

## Last round's tables

```text
Proof folder: /tmp/agentests-benchmark/prove-2026-11-23T07-50-27-196Z
Proving couchbase-redact-user-data-in-logs on luna: 29 eval(s)
couchbase-redact-user-data-in-logs on luna (gpt-6-luna): 28 of 29 eval(s) match; 140 decision call(s), 195871 input and 0 output token(s), 0.0196 USD
eval                                            expected  actual  match  decisions  error
careful-import-debug                            pass      pass    yes    5
careful-login-warning                           pass      pass    yes    5
careful-oidc-failure                            pass      pass    yes    5
careful-session-expiry                          pass      pass    yes    5
careful-session-expiry-in-store                 pass      pass    yes    5
careless-import-debug                           fail      pass    no     5
careless-login-warning                          fail      fail    yes    5
careless-oidc-failure                           fail      fail    yes    5
careless-session-expiry                         fail      fail    yes    5
compaction-logs-only-counts                     pass      pass    yes    5
import-debug-body-in-user-data-wrapper          pass      pass    yes    5
import-debug-raw-doc-id-in-one-line             fail      fail    yes    5
logger-and-silent-files-not-selected            skip      skip    yes    0
login-warning-raw-db-name                       fail      fail    yes    5
login-warning-raw-username                      fail      fail    yes    5
login-warning-with-password-tried               fail      fail    yes    5
oidc-failure-body-in-user-data-wrapper          fail      fail    yes    5
oidc-failure-logs-code-and-client-secret        fail      fail    yes    5
oidc-failure-raw-error-fields                   fail      fail    yes    5
oidc-failure-raw-provider-name                  fail      fail    yes    5
purge-logs-wrapped-id-and-error                 pass      pass    yes    5
reset-mail-email-wrapped                        pass      pass    yes    5
reset-mail-raw-email                            fail      fail    yes    5
session-expiry-raw-username-in-store            fail      fail    yes    5
session-expiry-session-id-in-user-data-wrapper  fail      fail    yes    5
shipped-files                                   pass      pass    yes    5
unknown-config-key-raw                          fail      fail    yes    5
unknown-config-key-wrapped                      pass      pass    yes    5
username-in-metadata-wrapper                    fail      fail    yes    5

Proving couchbase-redact-user-data-in-logs on jev: 29 eval(s)
couchbase-redact-user-data-in-logs on jev (jev-latest): 27 of 29 eval(s) match; 140 decision call(s), 210206 input and 3080 output token(s), 0.0088 USD
eval                                            expected  actual  match  decisions  error
careful-import-debug                            pass      pass    yes    5
careful-login-warning                           pass      pass    yes    5
careful-oidc-failure                            pass      pass    yes    5
careful-session-expiry                          pass      pass    yes    5
careful-session-expiry-in-store                 pass      pass    yes    5
careless-import-debug                           fail      fail    yes    5
careless-login-warning                          fail      fail    yes    5
careless-oidc-failure                           fail      fail    yes    5
careless-session-expiry                         fail      fail    yes    5
compaction-logs-only-counts                     pass      pass    yes    5
import-debug-body-in-user-data-wrapper          pass      pass    yes    5
import-debug-raw-doc-id-in-one-line             fail      pass    no     5
logger-and-silent-files-not-selected            skip      skip    yes    0
login-warning-raw-db-name                       fail      fail    yes    5
login-warning-raw-username                      fail      fail    yes    5
login-warning-with-password-tried               fail      fail    yes    5
oidc-failure-body-in-user-data-wrapper          fail      pass    no     5
oidc-failure-logs-code-and-client-secret        fail      fail    yes    5
oidc-failure-raw-error-fields                   fail      fail    yes    5
oidc-failure-raw-provider-name                  fail      fail    yes    5
purge-logs-wrapped-id-and-error                 pass      pass    yes    5
reset-mail-email-wrapped                        pass      pass    yes    5
reset-mail-raw-email                            fail      fail    yes    5
session-expiry-raw-username-in-store            fail      fail    yes    5
session-expiry-session-id-in-user-data-wrapper  fail      fail    yes    5
shipped-files                                   pass      pass    yes    5
unknown-config-key-raw                          fail      fail    yes    5
unknown-config-key-wrapped                      pass      pass    yes    5
username-in-metadata-wrapper                    fail      fail    yes    5

Proof: /tmp/agentests-benchmark/prove-2026-11-23T07-50-27-196Z/proof.json
```

Remaining mismatches (no refusal, no error):

- luna, `careless-import-debug`: expected fail, got pass. This is task 2 done carelessly (three raw `doc.ID` and a `%+v` of the document), so Luna's gate may let the careless task 2 through. Luna did fail it in rounds 1, 2 and 4.
- jev, `import-debug-raw-doc-id-in-one-line`: expected fail, got pass (one bare doc id among three wrapped ones). Jev failed it only in round 1.
- jev, `oidc-failure-body-in-user-data-wrapper`: expected fail, got pass. The secrets criterion was word for word the same in rounds 3, 4 and 5; Jev failed this eval in round 3 and passed it in 4 and 5, so Jev's answer on it is not stable.

## What did not work as written, and other things to know

- The runbook says there is no Go toolchain, and the research fixture and the triage are Go (`*.go`, `base.UD`). I kept Go. This machine has Go 1.24 at /usr/local/go, and the fixture's tests pass with `go test ./...`; if the agent's machine has no Go, the agent cannot run them, and nothing in the tasks requires it.
- The fixture is 15 files rather than "a dozen or so": go.mod, README, CHANGELOG, base/log.go, auth.go, session.go and oidc.go with two test files, db/import.go and db/revid.go with their tests, rest/handler.go and its test.
- As the research fixture says, db/import.go already has wrapped log calls, one of them `base.UD(doc.ID)`, right where task 2 works; the baseline can imitate it. The auth and rest files have no log call before the task.
- The fixture carries four planted chores for the long tasks' other steps: `CompareRevIDs` compares generations as text, the README says 20 MB where the code says 1 MB, `SessionStore.Create` ignores its TTL, and `Validate` accepts an empty token endpoint. An expired session answers 500 as shipped, which is task 3's premise.
- The rule text adds standing policy beyond the triage's one `policy_facts` line: what counts as metadata, the list of secrets with the raw provider response among them (from the triage's `how`), and what needs no wrapper (counts, status codes, Go errors, fixed strings).
- Limit of the Test: a log written with `log.Printf`, `fmt.Println` or `slog` in a file that never calls the `base` logger is not selected, so the gate cannot see it; the rubric tells the judge to count it as unwrapped. The select was kept to the `base` calls so that the Test skips Go files in other entries' fixtures.
- The wrapper questions cost two decision calls each (5 per selected file in total).

## Not verified

- No agent was run, so how often the baseline actually breaks the rule, and whether the skill's description gets it loaded beside nine others, is unknown.
- The Test was not run in any other entry's fixture; it selects only Go files containing `base.InfofCtx(`, `base.WarnfCtx(` or `base.DebugfCtx(`.
- Both models gave different answers to an unchanged criterion and file between rounds, so the last round's counts can move by an eval or two on a rerun.
