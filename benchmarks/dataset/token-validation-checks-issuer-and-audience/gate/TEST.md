# Token validation checks issuer and audience

Larkspur Mail's API, in its TypeScript source under `src/`, accepts the access tokens of two
identity providers: work accounts from the enterprise provider and personal accounts from the
consumer provider. In every source file that verifies a token, reads a token's claims, or
authenticates requests with a token:

Code that accepts a signed token must check its issuer, audience (and tenant or scope where relevant), algorithm and expiry, not only that the signature verifies against some trusted key.

- Tokens are verified with `jwtVerify(token, keys, options)` from `src/lib/jwt.ts`. It always checks the signature, and checks the expiry unless it is given `ignoreExpiration: true`; a `clockTolerance` above 60 seconds counts as not checking it. It checks the issuer, the audience and the algorithm only when it is given the `issuer`, `audience` and `algorithms` options. `decodeJwt` checks nothing. Both identity providers sign with RS256 only.
- `src/auth/jwks.ts` exports `enterpriseKeys` and `consumerKeys`, each identity provider's own keys, and `allKeys`, the two merged. A token is verified with the keys of the issuer it must come from, `enterpriseKeys` with `ENTERPRISE_ISSUER` and `consumerKeys` with `CONSUMER_ISSUER` from `src/config.ts`, never with `allKeys`.
- The API's own audiences are `API_AUDIENCE` and `API_APP_ID` from `src/config.ts`. The audience checked is one or both of them, never a value taken from the token.
- An enterprise token's `tid` claim is its organization's tenant id. A request to a route under `/api/enterprise/:tenantId/` is served only when `tid` equals that `:tenantId`.

The tests under `test/`, any `*.test.ts` or `*.spec.ts` file, and the JWT library in `src/lib/`
are not judged. A source file that takes no token, verifies none and reads no claims from one has
nothing to judge, and so does a file that only calls a verifying function defined in another file
without serving a tenant's routes.
