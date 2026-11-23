/** The gateway's settings. */
export interface Config {
	port: number;
	/** The region this gateway serves. */
	region: string;
	/** The maps API that requests are forwarded to. */
	upstreamUrl: string;
	/** The policies file the policy service replicates to this gateway. */
	policiesPath: string;
}

/** Reads the settings from the environment, with a default for each. */
export function loadConfig(env: Record<string, string | undefined>): Config {
	return {
		port: Number(env.PORT ?? 8080),
		region: env.GATEWAY_REGION ?? 'eu-west',
		upstreamUrl: env.UPSTREAM ?? 'http://localhost:9000',
		policiesPath: env.POLICIES_PATH ?? 'policies.json'
	};
}
