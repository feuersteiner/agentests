/** Settings of the Larkspur mail relay, read once at startup. */
export interface RelayConfig {
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPassword: string;
	fromAddress: string;
}

const required = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`Set ${name} in the environment.`);
	return value;
};

export const loadConfig = (): RelayConfig => ({
	smtpHost: required('SMTP_HOST'),
	smtpPort: Number(process.env.SMTP_PORT ?? 587),
	smtpUser: required('SMTP_USER'),
	smtpPassword: required('SMTP_PASSWORD'),
	fromAddress: process.env.FROM_ADDRESS ?? 'no-reply@larkspur.example'
});

/** The config with the password masked, for the startup log. */
export const describeConfig = (config: RelayConfig): string =>
	JSON.stringify({ ...config, smtpPassword: '********' });
