import {ModelInfo} from '../../interfaces/sessions.js';
import {ConfigManager} from '../configs/configManager.js';
import {LLMService} from './llm/LLMService.js';
import {ToolExecutionRequest, Tool} from '../../interfaces/tools.js';
import {TokenUsage} from '../../interfaces/sessions.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelSelection {
	provider: string;
	model_name: string;
	display_name?: string;
	context_length?: number;
	supports_tools?: boolean;
}

export interface ModelValidationResult {
	isValid: boolean;
	modelInfo?: ModelInfo;
	error?: string;
}

export interface ModelUsageRequest {
	message: string;
	context?: string;
	sessionId: string;
	// Optional: if not provided, will use default model
	provider?: string;
	model?: string;
	// Optional: flag to indicate if context should be included (first message)
	includeContext?: boolean;
	tools?: Tool[];
}

export class ModelManager {
	private configManager: ConfigManager;
	private llmService: LLMService;

	constructor(configManager: ConfigManager, llmService: LLMService) {
		this.configManager = configManager;
		this.llmService = llmService;
	}

	/**
	 * Gets the effective model to use for a request
	 * Priority: explicit model > default model > error
	 */
	getEffectiveModel(provider?: string, model?: string): ModelSelection | null {
		// If explicit model is provided, use it
		if (provider && model) {
			return {
				provider,
				model_name: model,
				display_name: model,
			};
		}

		// Try to use default model
		const defaultModel = this.configManager.getDefaultModel();
		if (defaultModel) {
			return {
				provider: defaultModel.provider,
				model_name: defaultModel.model_name,
				display_name: defaultModel.display_name,
				context_length: defaultModel.context_length,
				supports_tools: defaultModel.supports_tools,
			};
		}

		// No model available
		return null;
	}

	/**
	 * Validates a model against the backend (if available)
	 */
	async validateModel(
		provider: string,
		model: string,
	): Promise<ModelValidationResult> {
		try {
			const response = await this.llmService.validateModel(provider, model);

			if (response.status === 'success' && response.data.valid) {
				const modelInfo: ModelInfo = {
					provider,
					model_name: model,
					display_name: response.data.model_info?.display_name || model,
					context_length: response.data.model_info?.context_length || 0,
					supports_tools: response.data.model_info?.supports_tools || false,
				};

				return {
					isValid: true,
					modelInfo,
				};
			} else {
				return {
					isValid: false,
					error: `Invalid model: ${provider}/${model}`,
				};
			}
		} catch (error) {
			// If backend is not available, assume model is valid for offline usage
			console.warn(`Model validation failed (backend unavailable): ${error}`);
			return {
				isValid: true,
				modelInfo: {
					provider,
					model_name: model,
					display_name: model,
					context_length: 0,
					supports_tools: false,
				},
			};
		}
	}

	/**
	 * Sets the default model with optional validation
	 */
	async setDefaultModel(
		provider: string,
		model: string,
		validateWithBackend = false,
	): Promise<{success: boolean; error?: string; modelInfo?: ModelInfo}> {
		try {
			let modelInfo: ModelInfo;

			if (validateWithBackend) {
				const validation = await this.validateModel(provider, model);
				if (!validation.isValid) {
					return {
						success: false,
						error:
							validation.error || `Failed to validate ${provider}/${model}`,
					};
				}
				modelInfo = validation.modelInfo!;
			} else {
				// Set without validation for offline usage
				modelInfo = {
					provider,
					model_name: model,
					display_name: model,
					context_length: 0,
					supports_tools: false,
				};
			}

			this.configManager.setDefaultModel(modelInfo);

			return {
				success: true,
				modelInfo,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Gets the current default model
	 */
	getDefaultModel(): ModelInfo | undefined {
		return this.configManager.getDefaultModel();
	}

	/**
	 * Checks if a default model is configured
	 */
	hasDefaultModel(): boolean {
		return this.configManager.hasDefaultModel();
	}

	/**
	 * Clears the default model
	 */
	clearDefaultModel(): void {
		this.configManager.clearDefaultModel();
	}

	/**
	 * Load octopus.md content as context for conversations
	 */
	private loadOctopusContext(): string | undefined {
		try {
			const octopusPath = path.join(process.cwd(), 'octopus.md');
			if (fs.existsSync(octopusPath)) {
				const content = fs.readFileSync(octopusPath, 'utf8');
				return `# Project Context (from octopus.md)\n\n${content}\n\n---\n\n`;
			}
		} catch (error) {
			console.warn('Failed to load octopus.md:', error);
		}
		return undefined;
	}

	/**
	 * Load 9octopus.system.md content as system prompt
	 */
	private loadSystemPrompt(): string | undefined {
		try {
			const systemPromptPath = path.join(process.cwd(), '9octopus.system.md');
			if (fs.existsSync(systemPromptPath)) {
				return fs.readFileSync(systemPromptPath, 'utf8');
			}
		} catch (error) {
			console.warn('Failed to load 9octopus.system.md:', error);
		}
		return undefined;
	}

	/**
	 * Starts a conversation with the best available model
	 */
	async startConversation(request: ModelUsageRequest): Promise<any> {
		const effectiveModel = this.getEffectiveModel(
			request.provider,
			request.model,
		);

		if (!effectiveModel) {
			throw new Error(
				'No model available. Please set a default model or specify one explicitly.',
			);
		}

		// Only include context on first message or when explicitly requested
		let combinedContext: string | undefined;
		if (request.includeContext !== false) {
			// Default to true for backward compatibility
			const octopusContext = this.loadOctopusContext();
			combinedContext = octopusContext
				? request.context
					? `${octopusContext}${request.context}`
					: octopusContext
				: request.context;
		} else {
			combinedContext = undefined; // Don't send context for subsequent messages
		}

		const systemPrompt = this.loadSystemPrompt();

		return this.llmService.startConversation(
			request.sessionId,
			request.message,
			combinedContext,
			effectiveModel.provider,
			effectiveModel.model_name,
			systemPrompt,
			request.tools,
		);
	}

	// Callback Management Methods

	setOnUpdateCallback(
		callback: (
			action: string,
			details?: string,
			type?: 'text' | 'code' | 'command',
		) => void,
	): void {
		this.llmService.setOnUpdateCallback(callback);
	}

	setToolRequestCallback(
		callback: (request: ToolExecutionRequest) => void,
	): void {
		this.llmService.setToolRequestCallback(callback);
	}

	setStatusUpdateCallback(callback: (message: string) => void): void {
		this.llmService.setStatusUpdateCallback(callback);
	}

	setTokenUsageUpdateCallback(
		callback: (tokenUsage: TokenUsage) => void,
	): void {
		this.llmService.setTokenUsageUpdateCallback(callback);
	}

	/**
	 * Gets model selection info for display purposes
	 */
	getModelSelectionInfo(
		provider?: string,
		model?: string,
	): {
		effectiveModel: ModelSelection | null;
		isUsingDefault: boolean;
		source: 'explicit' | 'default' | 'none';
	} {
		const isUsingDefault = !provider && !model;
		const effectiveModel = this.getEffectiveModel(provider, model);

		let source: 'explicit' | 'default' | 'none';
		if (provider && model) {
			source = 'explicit';
		} else if (effectiveModel) {
			source = 'default';
		} else {
			source = 'none';
		}

		return {
			effectiveModel,
			isUsingDefault,
			source,
		};
	}

	/**
	 * Gets the config manager for advanced operations
	 */
	getConfigManager(): ConfigManager {
		return this.configManager;
	}

	/**
	 * Formats a model for display
	 */
	formatModelDisplay(model: ModelSelection | ModelInfo): string {
		const displayName = model.display_name || model.model_name;
		return `${model.provider}/${displayName}`;
	}
}
