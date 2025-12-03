import {replaceInFileSync} from 'replace-in-file';
import dotenv from 'dotenv';

console.log('Starting injection script...');
// Load environment variables from .env file
console.log('Loading .env...');
const result = dotenv.config();
console.log('Loaded .env');

if (result.error) {
	console.warn('No .env file found, skipping injection.');
	process.exit(0);
}

const env = result.parsed;

// List of allowed variables to inject (security whitelist)
const ALLOWED_KEYS = [
	'AUTH_ENABLED',
	'NODE_ENV',
	'OCTOPUS_API_URL',
	'AUTH0_DOMAIN',
	'AUTH0_CLIENT_ID',
	'AUTH0_AUDIENCE',
	'NETWORK_RETRY_MAX_ATTEMPTS',
	'NETWORK_RETRY_BASE_DELAY',
	'NETWORK_RETRY_MAX_DELAY',
	'NETWORK_RETRY_JITTER_PERCENT',
	'NETWORK_CONNECTION_TIMEOUT',
	'NETWORK_REQUEST_TIMEOUT',
	'DEFAULT_PROVIDER',
	'DEFAULT_MODEL',
];

const files = 'dist/**/*.js';

try {
	const options = {
		files: files,
		// Match process.env.VAR, process.env['VAR'], or process.env["VAR"]
		from: new RegExp(
			`process\\.env(?:(?:\\.(${ALLOWED_KEYS.join(
				'|',
			)}))|(?:\\[['"](${ALLOWED_KEYS.join('|')})['"]\\]))`,
			'g',
		),
		to: (match, p1, p2) => {
			const key = p1 || p2;
			const value = env[key] || process.env[key];
			// If value is undefined, keep the original process.env.VAR string
			// so it can be resolved at runtime if needed, or remains undefined.
			// However, for build-time injection, we usually want to hardcode.
			// Let's hardcode string values.
			if (value !== undefined) {
				console.log(`Injecting ${key}`);
				return JSON.stringify(value);
			}
			return match;
		},
	};

	const results = replaceInFileSync(options);
	console.log(
		'Environment variables injected:',
		results.filter(r => r.hasChanged).map(r => r.file),
	);
} catch (error) {
	console.error('Error occurred:', error);
	process.exit(1);
}
