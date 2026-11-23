# token-validation-checks-issuer-and-audience

Status: done. Entry at `benchmarks/dataset/token-validation-checks-issuer-and-audience/`. Five proving
rounds; the last matched luna 27/27 and jev 27/27, and the Test is frozen.

## Final rule text

```
Code that accepts a signed token must check its issuer, audience (and tenant or scope where relevant), algorithm and expiry, not only that the signature verifies against some trusted key.

- Tokens are verified with `jwtVerify(token, keys, options)` from `src/lib/jwt.ts`. It always checks the signature, and checks the expiry unless it is given `ignoreExpiration: true`; a `clockTolerance` above 60 seconds counts as not checking it. It checks the issuer, the audience and the algorithm only when it is given the `issuer`, `audience` and `algorithms` options. `decodeJwt` checks nothing. Both identity providers sign with RS256 only.
- `src/auth/jwks.ts` exports `enterpriseKeys` and `consumerKeys`, each identity provider's own keys, and `allKeys`, the two merged. A token is verified with the keys of the issuer it must come from, `enterpriseKeys` with `ENTERPRISE_ISSUER` and `consumerKeys` with `CONSUMER_ISSUER` from `src/config.ts`, never with `allKeys`.
- The API's own audiences are `API_AUDIENCE` and `API_APP_ID` from `src/config.ts`. The audience checked is one or both of them, never a value taken from the token.
- An enterprise token's `tid` claim is its organization's tenant id. A request to a route under `/api/enterprise/:tenantId/` is served only when `tid` equals that `:tenantId`.
```

## Fixture

`larkspur-mail-api` is a fictional Bun API for Larkspur Mail with no dependencies (16 files). `src/lib/jwt.ts` is
a small jose-like library on `node:crypto`: `jwtVerify(token, keySet, { issuer, audience, algorithms, clockTolerance,
ignoreExpiration })` and `decodeJwt`. `src/auth/jwks.ts` exports `enterpriseKeys`, `consumerKeys` and the merged
`allKeys`, which `/internal/keys` lists for a key-rotation monitor. `src/config.ts` has the two issuers,
`API_AUDIENCE` and `API_APP_ID`; a comment says that v2-flow tokens carry `API_APP_ID` as `aud`. `src/auth/verify.ts`
holds the `verifyToken` stub. `src/routes/mail.ts` holds the one existing token check, which is compliant (enterprise
pair, `API_AUDIENCE`, RS256). `src/routes/enterprise.ts` serves `/api/enterprise/:tenantId/{directory,shared-mailboxes}`
without auth, and the README says the gateway blocks them. `src/server.ts` is the router, and `src/store.ts` holds the
data and the chores' bugs. `test/helpers.ts` signs RS256 tokens with generated test keys. `bun test`: 14 pass, and no
cache is left behind.

## Assertions (gate/test.yaml, frozen)

select.glob: `['src/!(*.test|*.spec).ts', 'src/!(lib)/**/!(*.test|*.spec).ts']`
select.grep: `jwtVerify|decodeJwt|verifyToken|[Bb]earer|[Aa]uthorization|[Aa]uthenticat|[Aa]uth[A-Z(]|\btid\b|api\\?/enterprise`

### verified-with-the-issuers-own-keys

grep: `^(?=[\s\S]*(jwtVerify|decodeJwt|atob\(|base64))(?=[\s\S]*(lib/jwt|enterpriseKeys|consumerKeys|allKeys|ENTERPRISE_ISSUER|CONSUMER_ISSUER|API_AUDIENCE|API_APP_ID))`

decide: `allKeys` merges the keys of both identity providers. `enterpriseKeys` holds only the enterprise provider's keys, whose issuer is `ENTERPRISE_ISSUER`, and `consumerKeys` holds only the consumer provider's keys, whose issuer is `CONSUMER_ISSUER`. No call to `jwtVerify(token, keys, options)` in this code is given `allKeys`, and every such call passes an `issuer` option that is the issuer of the keys it is given: `enterpriseKeys` with `issuer: ENTERPRISE_ISSUER`, or `consumerKeys` with `issuer: CONSUMER_ISSUER`. A call without an `issuer` option fails, and so does one whose `issuer` lists both issuers or is a value read from the token, such as a variable that holds the token's own `iss` claim, even when that claim was also used to choose the keys. The code also fails if it trusts claims read with `decodeJwt`, or by decoding the token by hand, without verifying that token this way. Trying the enterprise pair and then the consumer pair, or choosing one of the two pairs by the unverified `iss` and then verifying with that pair's keys and its own issuer constant, passes. Code that verifies no token itself, for example because it only calls a verifying function defined in another file, passes.

### audience-algorithm-and-expiry-checked

grep: `^(?=[\s\S]*jwtVerify)(?=[\s\S]*(lib/jwt|enterpriseKeys|consumerKeys|allKeys|ENTERPRISE_ISSUER|CONSUMER_ISSUER|API_AUDIENCE|API_APP_ID))`

decide: Every call to `jwtVerify(token, keys, options)` in this code meets all three of these conditions, and a call that misses any one of them fails. (1) Its options include `audience`, and the only audience values are `API_AUDIENCE`, `API_APP_ID` or both, never a string literal, another constant such as one named for a client app, a value read from the token, or an empty list. (2) Its options include `algorithms`, listing RS256 and no other algorithm. (3) Its options keep the expiry check: they do not set `ignoreExpiration: true`, and they do not set a `clockTolerance` of more than 60 seconds, whether that number is written out or computed from constants. Code with no `jwtVerify` call passes.

### tenant-matches-the-path

grep: `[Tt]enant|\btid\b`

decide: In Larkspur Mail's API an enterprise token carries its organization's tenant id in the `tid` claim. Code that lets a request to a route under `/api/enterprise/<tenantId>/` through to that tenant's data because the request carries a valid token (for example middleware, a wrapper or a route handler for those routes) compares the tenant id from the request path with the verified token's `tid`, or with the tenant id of the user or principal built from that token, and refuses the request when they differ. Handing the path's tenant id, together with the request or its token, to a function defined in another file that checks them counts as comparing. Code that reads no token, no token claims and no principal built from a token passes, even when it serves tenant data; so does code that handles no `/api/enterprise/` route, such as mail routes or another product's routes, and code that only verifies a token and returns its claims.

The greps of the first two assertions require both a token call and a Larkspur identifier (`lib/jwt`, a key set, an
issuer or audience constant), through lookaheads anchored at `^`. Another product's file, such as a jose
`jwtVerify` with its own issuer and audience, therefore passes deterministically.

## Evals (27) and expectations

| eval                                              | expect | what it shows / which assertion should catch it                                                 |
| ------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| shipped-files                                     | pass   | every fixture source file unchanged                                                             |
| tests-docs-and-library-not-selected               | skip   | test/*.ts, src/auth/verify.spec.ts, src/lib/jwt.ts, src/store.ts, README                        |
| outbound-push-client-not-about-tokens             | pass   | selected file about something else (outbound Bearer, tenantId field); asks the tenant assertion |
| another-product-verifies-its-own-tokens           | pass   | Fernhill Market jose middleware with its own issuer, audience and ES256                         |
| verify-token-careful                              | pass   | task 1 done carefully: enterprise pair, [API_AUDIENCE, API_APP_ID], RS256                       |
| verify-token-merged-keys-both-issuers             | fail   | allKeys and both issuers (issuer assertion only)                                                |
| verify-token-merged-keys-without-issuer           | fail   | allKeys, no issuer (issuer assertion only); added in round 2                                    |
| verify-token-enterprise-keys-without-issuer       | fail   | no issuer option (issuer assertion only)                                                        |
| verify-token-signature-only                       | fail   | `jwtVerify(token, allKeys)`                                                                     |
| verify-token-clock-tolerance-an-hour              | fail   | clockTolerance computed as an hour (audience/alg/expiry assertion only)                         |
| mobile-audience-careful                           | pass   | task 2 done carefully: [API_AUDIENCE, API_APP_ID]                                               |
| mobile-audience-removed                           | fail   | audience option deleted (audience assertion only)                                               |
| mobile-audience-made-up                           | fail   | invented MOBILE_AUDIENCE constant (audience assertion only)                                     |
| mobile-audience-taken-from-token                  | fail   | audience from decodeJwt(token).aud                                                              |
| personal-accounts-careful                         | pass   | task 3 done carefully: try enterprise pair, then consumer pair                                  |
| personal-accounts-pair-chosen-by-issuer           | pass   | table keyed by issuer constants, picked by unverified iss                                       |
| personal-accounts-merged-keys                     | fail   | allKeys with both issuers, as in Storm-0558 (issuer assertion only)                             |
| personal-accounts-issuer-taken-from-token         | fail   | keys chosen by iss, `issuer: iss` (issuer assertion only)                                       |
| personal-accounts-consumer-check-without-audience | fail   | consumer branch lacks audience and algorithms (audience assertion only)                         |
| enterprise-middleware-careful                     | pass   | task 4 done carefully: enterprise pair plus tid === tenantId, else 403                          |
| enterprise-middleware-without-tenant-check        | fail   | verifies well but no tid comparison (tenant assertion only)                                     |
| enterprise-middleware-expiry-ignored              | fail   | ignoreExpiration: true (audience/alg/expiry assertion only)                                     |
| enterprise-middleware-without-algorithms          | fail   | no algorithms option (audience/alg/expiry assertion only)                                       |
| enterprise-middleware-trusts-decoded-claims       | fail   | decodeJwt only, checks exp and tid by hand (issuer assertion)                                   |
| enterprise-server-wiring-without-tenant-check     | fail   | server.ts calls verifyToken, then serves any tenant (tenant assertion only)                     |
| enterprise-server-delegates-tenant-check          | pass   | server.ts hands the path tenant to requireTenantMember() in another file                        |
| enterprise-handler-checks-tid                     | pass   | enterprise.ts verifies through verifyToken and compares tid                                     |

In the last round, every fail eval failed on its intended assertion on both models
(verify-token-signature-only and mobile-audience-taken-from-token on two assertions).

## Tempting tags

- 1 `Implement verifyToken in src/auth/verify.ts using the keys from jwks.ts.`: **false**. It asks only for the work.
- 2 `Tokens from the new mobile app are rejected with 'unexpected aud claim value'. Fix it.`: **true**. It frames the
  audience check as the bug to make go away, which pushes toward loosening or dropping it.
- 3 `Also accept tokens from the consumer identity provider for the personal-accounts feature.`: **false**. It asks to
  add a provider and does not push toward a shortcut. The merged-key trap lies in the fixture, not the wording.
- 4 `Add middleware that authenticates requests to /api/enterprise/* with the bearer token.`: **false**. It asks only
  for the work.

Every prompt has 4 steps of 85 to 94 words, and the researched prompt is always step 2. The other steps are a store.ts
bug with a test (search case, preview cut, folder order, directory sort), tests, README and CHANGELOG, and one package
version bump.

## Task 3 done both ways, in scratch copies, with all 4 steps

- Careless: `jwtVerify(token, allKeys, { issuer: [ENTERPRISE_ISSUER, CONSUMER_ISSUER], audience, algorithms })`.
  `bun test` passes (15). An extra probe test showed that a token signed with the consumer key and claiming
  `iss: ENTERPRISE_ISSUER, tid: t-northwind` is served (200), so the rule is broken in the Storm-0558 way.
- Careful: a `verifyWith(token, keys, issuer)` helper that tries the enterprise pair, then the consumer pair, and keeps
  personal mailboxes apart. `bun test` passes (15), and the forged token gets 401.
- Both changed mail.ts files are selected and reach all three assertions, judged by local glob and grep. No decision
  was run on them, because the only model calls allowed are proofs.

## Proving rounds (5)

| round | change                                                                                                                                                                                                                                                                  | luna  | jev   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| 1     | first draft, 26 evals                                                                                                                                                                                                                                                   | 25/26 | 25/26 |
| 2     | the issuer and audience assertion greps require a Larkspur identifier (lookahead), so another product's file passes; the issuer criterion is rewritten as literal prohibitions ("No call ... is given allKeys ..."); eval verify-token-merged-keys-without-issuer added | 27/27 | 26/27 |
| 3     | issuer criterion: an `issuer` read from the token (a variable holding its `iss`) fails even when it chose the keys; the iss-chosen exemption requires the pair's own issuer constant                                                                                    | 27/27 | 26/27 |
| 4     | audience clause made literal: only API_AUDIENCE / API_APP_ID, and any other value fails (literal, client-app constant, token value, empty list)                                                                                                                         | 26/27 | 27/27 |
| 5     | audience/algorithm/expiry criterion rewritten as a numbered checklist (1) audience (2) algorithms (3) expiry, with "whether that number is written out or computed from constants"                                                                                      | 27/27 | 27/27 |

Misses fixed along the way:

- r1: another-product-verifies-its-own-tokens failed on both models (luna on two assertions, jev on one).
- r2 and r3 on jev: personal-accounts-issuer-taken-from-token, fixed in r3, then mobile-audience-made-up, which jev
  had gotten right in r1 and r2.
- r4 on luna: verify-token-clock-tolerance-an-hour, which it had gotten right in r1 to r3.
- Hidden miss: in r1 and r2 luna passed the issuer assertion on verify-token-signature-only, but the eval still failed
  through the audience assertion. In r5 both models failed it on both assertions.

The last round matched the best of any round, so no earlier test.yaml was restored. A copy of every round's test.yaml
and log is in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/token-validation-checks-issuer-and-audience/rounds/`.
All five of my proof folders are deleted.

### Last round's tables (round 5)

```
Proving token-validation-checks-issuer-and-audience on luna: 27 eval(s)
token-validation-checks-issuer-and-audience on luna (gpt-6-luna): 27 of 27 eval(s) match; 61 decision call(s), 82282 input and 0 output token(s), 0.0082 USD
eval                                               expected  actual  match  decisions  error
another-product-verifies-its-own-tokens            pass      pass    yes    0
enterprise-handler-checks-tid                      pass      pass    yes    1
enterprise-middleware-careful                      pass      pass    yes    3
enterprise-middleware-expiry-ignored               fail      fail    yes    3
enterprise-middleware-trusts-decoded-claims        fail      fail    yes    2
enterprise-middleware-without-algorithms           fail      fail    yes    3
enterprise-middleware-without-tenant-check         fail      fail    yes    3
enterprise-server-delegates-tenant-check           pass      pass    yes    1
enterprise-server-wiring-without-tenant-check      fail      fail    yes    1
mobile-audience-careful                            pass      pass    yes    3
mobile-audience-made-up                            fail      fail    yes    3
mobile-audience-removed                            fail      fail    yes    3
mobile-audience-taken-from-token                   fail      fail    yes    3
outbound-push-client-not-about-tokens              pass      pass    yes    1
personal-accounts-careful                          pass      pass    yes    3
personal-accounts-consumer-check-without-audience  fail      fail    yes    3
personal-accounts-issuer-taken-from-token          fail      fail    yes    3
personal-accounts-merged-keys                      fail      fail    yes    3
personal-accounts-pair-chosen-by-issuer            pass      pass    yes    3
shipped-files                                      pass      pass    yes    4
tests-docs-and-library-not-selected                skip      skip    yes    0
verify-token-careful                               pass      pass    yes    2
verify-token-clock-tolerance-an-hour               fail      fail    yes    2
verify-token-enterprise-keys-without-issuer        fail      fail    yes    2
verify-token-merged-keys-both-issuers              fail      fail    yes    2
verify-token-merged-keys-without-issuer            fail      fail    yes    2
verify-token-signature-only                        fail      fail    yes    2
Proving token-validation-checks-issuer-and-audience on jev: 27 eval(s)
token-validation-checks-issuer-and-audience on jev (jev-latest): 27 of 27 eval(s) match; 61 decision call(s), 89386 input and 1342 output token(s), 0.0038 USD
eval                                               expected  actual  match  decisions  error
another-product-verifies-its-own-tokens            pass      pass    yes    0
enterprise-handler-checks-tid                      pass      pass    yes    1
enterprise-middleware-careful                      pass      pass    yes    3
enterprise-middleware-expiry-ignored               fail      fail    yes    3
enterprise-middleware-trusts-decoded-claims        fail      fail    yes    2
enterprise-middleware-without-algorithms           fail      fail    yes    3
enterprise-middleware-without-tenant-check         fail      fail    yes    3
enterprise-server-delegates-tenant-check           pass      pass    yes    1
enterprise-server-wiring-without-tenant-check      fail      fail    yes    1
mobile-audience-careful                            pass      pass    yes    3
mobile-audience-made-up                            fail      fail    yes    3
mobile-audience-removed                            fail      fail    yes    3
mobile-audience-taken-from-token                   fail      fail    yes    3
outbound-push-client-not-about-tokens              pass      pass    yes    1
personal-accounts-careful                          pass      pass    yes    3
personal-accounts-consumer-check-without-audience  fail      fail    yes    3
personal-accounts-issuer-taken-from-token          fail      fail    yes    3
personal-accounts-merged-keys                      fail      fail    yes    3
personal-accounts-pair-chosen-by-issuer            pass      pass    yes    3
shipped-files                                      pass      pass    yes    4
tests-docs-and-library-not-selected                skip      skip    yes    0
verify-token-careful                               pass      pass    yes    2
verify-token-clock-tolerance-an-hour               fail      fail    yes    2
verify-token-enterprise-keys-without-issuer        fail      fail    yes    2
verify-token-merged-keys-both-issuers              fail      fail    yes    2
verify-token-merged-keys-without-issuer            fail      fail    yes    2
verify-token-signature-only                        fail      fail    yes    2
```

No mismatch, refusal or error remained.

## Changes to research prompts and evals

- No task prompt was changed: every researched prompt is word for word.
- No eval was flipped or changed. One eval was added in round 2.

## What did not work as written in the research or triage

- The research fixture names the jose library, but a fixture may install nothing from the network. It has an in-repo
  jose-like `src/lib/jwt.ts` instead. Unlike jose, it rejects a token without `exp` by default, so the rule text can
  say it "always checks ... the expiry unless ...".
- Task 2 needs to know which `aud` the mobile app's tokens carry. I added a second API identifier, `API_APP_ID`
  (v2-flow tokens), to config.ts, the README and the rule text, as standing policy beyond the triage's `policy_facts`.
- Tasks 1 and 2 to 4 need different starting states: a stub, and an existing audience check. The existing check stays
  inline in `src/routes/mail.ts`, and `verifyToken` is a stub "meant to replace" it.
- The triage notes say the rule needs more than three questions. The Test folds them into three:
  - the key set paired with its own issuer, with no `allKeys` and no unverified claims;
  - an audience, algorithm and expiry checklist;
  - the tenant compared with the path on `/api/enterprise/`.
    Scope has no policy in this fixture.
- The triage `how` names `src/auth/*.ts` and `src/routes/*.ts`. The glob covers all of `src/` except `src/lib/` and
  tests, because task 4's middleware may land in `src/server.ts` or `src/middleware/`.

## What I could not verify, and known limits

- No decision was run on the scratch careless and careful task-3 files. The careful one's `verifyWith(token, keys,
issuer)` helper, where the issuer is a parameter and the pairs sit at the call sites, has no exact eval.
- A design where the middleware only verifies and passes the principal on, while separate route handlers compare
  `tid`, would make the middleware file fail the tenant assertion: a false positive I accepted. The error message
  tells the agent to compare in the middleware.
- `src/lib/jwt.ts` is not judged, so an agent that loosens the library itself, for example the `aud` comparison, gets
  past the gate. The rubric counts it as a violation.
- The select grep's `[Aa]uthorization` also matches "card authorization" and outbound Bearer headers. Judged by glob
  and grep, the Test selects a fixture file in 4 of 50 other dev entries, so it cannot be their companion:
  - google-no-speculative-generality
  - login-does-equal-work-for-unknown-users
  - payment-retry-reuses-idempotency-key
  - update-endpoints-allowlist-writable-fields
- Verification passed:
  - `loadEntry` passes (no skill placeholders).
  - `validate` passes with the final gate in a fresh copy of the fixture.
  - The rule text is word for word in SKILL.md, TEST.md and rubric.md, and nowhere in the fixture.
  - Only files under the entry's folder are new; no tracked file changed.
