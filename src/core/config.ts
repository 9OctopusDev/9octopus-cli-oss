import process from 'process';

class Config {
	private settings = {
		AUTH_ENABLED: process.env['AUTH_ENABLED'] === 'true',
		NODE_ENV: process.env['NODE_ENV'] || 'development',
		OCTOPUS_API_URL: process.env['OCTOPUS_API_URL'] || '',
		AUTH0_DOMAIN: process.env['AUTH0_DOMAIN'] || '',
		AUTH0_CLIENT_ID: process.env['AUTH0_CLIENT_ID'] || '',
		AUTH0_AUDIENCE: process.env['AUTH0_AUDIENCE'] || '',
		NETWORK_RETRY_MAX_ATTEMPTS:
			process.env['NETWORK_RETRY_MAX_ATTEMPTS'] || '3',
		NETWORK_RETRY_BASE_DELAY: process.env['NETWORK_RETRY_BASE_DELAY'] || '1000',
		NETWORK_RETRY_MAX_DELAY: process.env['NETWORK_RETRY_MAX_DELAY'] || '10000',
		NETWORK_RETRY_JITTER_PERCENT:
			process.env['NETWORK_RETRY_JITTER_PERCENT'] || '25',
		NETWORK_CONNECTION_TIMEOUT:
			process.env['NETWORK_CONNECTION_TIMEOUT'] || '30000',
		NETWORK_REQUEST_TIMEOUT: process.env['NETWORK_REQUEST_TIMEOUT'] || '60000',
		DEFAULT_PROVIDER: process.env['DEFAULT_PROVIDER'] || '',
		DEFAULT_MODEL: process.env['DEFAULT_MODEL'] || '',
	};

	getSetting<T>(key: keyof typeof this.settings): T {
		return this.settings[key] as T;
	}

	// setSetting(key: string, value: any) {
	//     this.settings[key] = value;
	// }
}

const envConfig = new Config();

export default envConfig;
