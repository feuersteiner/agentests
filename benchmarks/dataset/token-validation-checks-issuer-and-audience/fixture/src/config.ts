/** Issuer of work-account tokens, from the enterprise identity provider. */
export const ENTERPRISE_ISSUER = 'https://login.larkspur-id.example/enterprise/v2.0';
/** Issuer of personal-account tokens, from the consumer identity provider. */
export const CONSUMER_ISSUER = 'https://login.larkspur-id.example/consumers/v2.0';

/** Where each identity provider publishes its signing keys. */
export const ENTERPRISE_JWKS_URL = 'https://login.larkspur-id.example/enterprise/discovery/keys';
export const CONSUMER_JWKS_URL = 'https://login.larkspur-id.example/consumers/discovery/keys';

/** The API's identifier URI at both identity providers: access tokens for this API name it in `aud`. */
export const API_AUDIENCE = 'https://mail-api.larkspur.example';
/**
 * The API's application id at the enterprise identity provider. Access tokens issued through that
 * provider's v2 flow name the API by this id in `aud` instead of by `API_AUDIENCE`.
 */
export const API_APP_ID = '5c0f3a9e-2b71-4d0c-9e4a-8f1d6b2a7c35';

export const PORT = Number(process.env.PORT ?? 8080);
