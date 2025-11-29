import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ModelInfo } from '../../interfaces/sessions.js';
import envConfig from '../config.js';

interface OctopusConfig {
	defaultModel?: ModelInfo;
	version: string;
}

export class ConfigManager {
	private configDir: string;
	private configPath: string;
	private config: OctopusConfig;

	constructor() {
		this.configDir = path.join(os.homedir(), '.octopus');
		this.configPath = path.join(this.configDir, 'config.json');
		this.config = this.loadConfig();
	}

	/**
	 * Ensures the .octopus directory exists
	 */
	private ensureConfigDir(): void {
		if (!fs.existsSync(this.configDir)) {
			fs.mkdirSync(this.configDir, { recursive: true });

		}
	}

	/**
	 * Loads configuration from disk or creates default config
	 */
	private loadConfig(): OctopusConfig {
		this.ensureConfigDir();

		if (fs.existsSync(this.configPath)) {
			try {
				const configData = fs.readFileSync(this.configPath, 'utf8');
				const config = JSON.parse(configData) as OctopusConfig;

				// Validate config version and migrate if needed
				if (!config.version) {
					config.version = '1.0.0';
				}

				// Return existing config without reading env vars
				return config;
			} catch (error) {
				console.warn(`Failed to load config from ${this.configPath}:`, error);
				return this.createDefaultConfigWithEnv();
			}
		}

		// Only read env vars when creating config for the first time
		return this.createDefaultConfigWithEnv();
	}

	/**
	 * Creates default configuration with env variables (only on first setup)
	 */
	private createDefaultConfigWithEnv(): OctopusConfig {
		const config: OctopusConfig = {
			version: '1.0.0',
		};

		// Check for environment variables
		const defaultProvider = envConfig.getSetting('DEFAULT_PROVIDER');
		const defaultModel = envConfig.getSetting('DEFAULT_MODEL');

		if (defaultProvider && defaultModel) {
			config.defaultModel = {
				provider: defaultProvider as string,
				model_name: defaultModel as string,
				display_name: defaultModel as string, // Will be updated when we validate
				context_length: 0, // Will be updated when we validate
				supports_tools: false, // Will be updated when we validate
			};

		}

		// Save the initial config to disk immediately
		this.saveConfigToDisk(config);

		return config;
	}

	/**
	 * Saves current configuration to disk
	 */
	private saveConfig(): void {
		this.saveConfigToDisk(this.config);
	}

	/**
	 * Saves a specific configuration to disk
	 */
	private saveConfigToDisk(config: OctopusConfig): void {
		try {
			this.ensureConfigDir();
			fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
		} catch (error) {

		}
	}

	/**
	 * Gets the default model
	 */
	getDefaultModel(): ModelInfo | undefined {
		return this.config.defaultModel;
	}

	/**
	 * Sets the default model and persists it
	 */
	setDefaultModel(modelInfo: ModelInfo): void {
		this.config.defaultModel = modelInfo;
		this.saveConfig();

	}

	/**
	 * Clears the default model
	 */
	clearDefaultModel(): void {
		delete this.config.defaultModel;
		this.saveConfig();

	}

	/**
	 * Checks if a default model is set
	 */
	hasDefaultModel(): boolean {
		return this.config.defaultModel !== undefined;
	}

	/**
	 * Gets the config directory path
	 */
	getConfigDir(): string {
		return this.configDir;
	}

	/**
	 * Gets the full configuration
	 */
	getConfig(): OctopusConfig {
		return { ...this.config };
	}
}
