---
name: token-validation-checks-issuer-and-audience
description: Use whenever you write or change TypeScript code under src/ that accepts a bearer token or JWT - token verification helpers, authentication middleware, route handlers that read token claims, support for another identity provider, client app or audience, or a fix for tokens that are being rejected - even if the request does not mention security. Covers which keys, issuer, audience, algorithm, expiry and tenant every token check must enforce with jwtVerify.
---

# Token validation checks issuer and audience

## The rule

Code that accepts a signed token must check its issuer, audience (and tenant or scope where relevant), algorithm and expiry, not only that the signature verifies against some trusted key.

- Tokens are verified with `jwtVerify(token, keys, options)` from `src/lib/jwt.ts`. It always checks the signature, and checks the expiry unless it is given `ignoreExpiration: true`; a `clockTolerance` above 60 seconds counts as not checking it. It checks the issuer, the audience and the algorithm only when it is given the `issuer`, `audience` and `algorithms` options. `decodeJwt` checks nothing. Both identity providers sign with RS256 only.
- `src/auth/jwks.ts` exports `enterpriseKeys` and `consumerKeys`, each identity provider's own keys, and `allKeys`, the two merged. A token is verified with the keys of the issuer it must come from, `enterpriseKeys` with `ENTERPRISE_ISSUER` and `consumerKeys` with `CONSUMER_ISSUER` from `src/config.ts`, never with `allKeys`.
- The API's own audiences are `API_AUDIENCE` and `API_APP_ID` from `src/config.ts`. The audience checked is one or both of them, never a value taken from the token.
- An enterprise token's `tid` claim is its organization's tenant id. A request to a route under `/api/enterprise/:tenantId/` is served only when `tid` equals that `:tenantId`.

## Why

A valid signature only proves that one of the trusted keys signed the token, not that it was
issued for this API, for this kind of account, or for this organization. In 2023 Exchange Online
accepted tokens signed with a Microsoft consumer key for enterprise mailboxes: the developers
assumed the library checked the issuer and scope, it did not, and an attacker with one consumer
key read enterprise mail. A merged key set does the same here: a token the consumer provider
signed, claiming the enterprise issuer and any `tid`, verifies against `allKeys`.

## How to apply it

1. Pick the pair first: work accounts are `enterpriseKeys` + `ENTERPRISE_ISSUER`, personal
   accounts are `consumerKeys` + `CONSUMER_ISSUER`. To accept both, try one pair and then the
   other, or choose the pair from the unverified `iss` and verify with that pair.
2. Always pass `issuer`, `audience` and `algorithms: ['RS256']` to `jwtVerify`.
3. When a token is rejected with an `aud` or `iss` error, find out which identifier it carries.
   Accept it only if it is one of the API's own; never drop or loosen the option to make it pass.
4. Read claims only from what `jwtVerify` returned, never from `decodeJwt`.
5. On tenant routes, compare the verified `tid` with the tenant id in the path and answer 403
   when they differ.

Slips to watch for: `jwtVerify(token, allKeys)`; `issuer: [ENTERPRISE_ISSUER, CONSUMER_ISSUER]`;
deleting `audience` to fix a rejection; `audience: payload.aud`; `ignoreExpiration: true` to make
an old test token pass; a middleware that authenticates but never compares `tid`.

## Example

A WebSocket endpoint takes the access token as a query parameter.

Violating: any key of either provider is accepted, for any issuer and audience.

```ts
async function onUpgrade(req: Request) {
	const token = new URL(req.url).searchParams.get('access_token') ?? '';
	const { payload } = await jwtVerify(token, allKeys);
	return openPushChannel(String(payload.sub), String(payload.tid));
}
```

Compliant: the enterprise keys with the enterprise issuer, the API's audience and the algorithm.

```ts
async function onUpgrade(req: Request) {
	const token = new URL(req.url).searchParams.get('access_token') ?? '';
	const { payload } = await jwtVerify(token, enterpriseKeys, {
		issuer: ENTERPRISE_ISSUER,
		audience: API_AUDIENCE,
		algorithms: ['RS256']
	});
	return openPushChannel(String(payload.sub), String(payload.tid));
}
```

## Before you commit

For every `jwtVerify` call in the diff, check the key set and issuer belong together and that
`audience` and `algorithms` are there; for every route that takes a tenant id, check that it is
compared with the verified `tid`. Fix what fails and check again.
