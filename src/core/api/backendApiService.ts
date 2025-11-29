import {
	TokenUsage,
	ModelsResponse,
	ConversationStatus,
} from '../../interfaces/sessions.js';

import { ToolExecutionRequest, ToolResult } from '../../interfaces/tools.js';
import { AuthService } from '../auth/authService.js';
import { AuthConfigManager } from '../configs/config.js';
import { RetryService, RetryConfig } from '../network/retryService.js';
import { NetworkErrorUtils } from '../network/networkErrors.js';
import { ConfigManager } from '../configs/configManager.js';
// import { EventSource } from 'eventsource';

export class BackendApiService {
	private baseURL: string;
	private onUpdateCallback: (
		action: string,
		details?: string | undefined,
		type?: 'text' | 'code' | 'command' | undefined,
	) => void;
	private setToolRequest: (request: ToolExecutionRequest) => void;
	private onStatusUpdate: (
		isWorking: boolean,
		message: string,
		type: 'thinking' | 'tool' | 'completing' | 'idle',
	) => void;
	private onTokenUsageUpdate: (tokenUsage: TokenUsage) => void;
	private currentStream: ReadableStreamDefaultReader<Uint8Array> | null = null;
	private authService: AuthService;
	private configManager: AuthConfigManager;
	private modelConfigManager: ConfigManager;
	private retryConfig: RetryConfig;
	private sessionId: string;

	constructor(sessionId: string, baseURL?: string) {
		this.configManager = AuthConfigManager.getInstance();
		this.baseURL = baseURL || this.configManager.getBaseURL();
		this.onUpdateCallback = () => { };
		this.setToolRequest = () => { };
		this.onStatusUpdate = () => { };
		this.onTokenUsageUpdate = () => { };
		this.authService = AuthService.getInstance();
		this.modelConfigManager = new ConfigManager();
		this.sessionId = sessionId;

		// Get retry configuration from config manager
		this.retryConfig = this.configManager.getRetryConfig();
	}

	/**
	 * Helper method to make retryable API requests with consistent error handling
	 */

	setOnUpdateCallback(
		onUpdateCallback: (
			action: string,
			details?: string | undefined,
			type?: 'text' | 'code' | 'command' | undefined,
		) => void,
	) {
		this.onUpdateCallback = onUpdateCallback;
	}

	setToolRequestCallback(
		setToolRequest: (request: ToolExecutionRequest) => void,
	) {
		this.setToolRequest = setToolRequest;
	}

	setStatusUpdateCallback(
		onStatusUpdate: (
			isWorking: boolean,
			message: string,
			type: 'thinking' | 'tool' | 'completing' | 'idle',
		) => void,
	) {
		this.onStatusUpdate = onStatusUpdate;
	}

	setTokenUsageUpdateCallback(onTokenUsageUpdate: (tokenUsage: any) => void) {
		this.onTokenUsageUpdate = onTokenUsageUpdate;
	}

	/**
	 * Get authentication headers for API requests
	 */
	private async getAuthHeaders(): Promise<Record<string, string>> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.configManager.isAuthEnabled()) {
			const accessToken = await this.authService.getAccessToken();
			if (accessToken) {
				headers['Authorization'] = `Bearer ${accessToken}`;
			} else {
				throw new Error('Authentication required. Please run: /login');
			}
		}

		return headers;
	}

	/**
	 * Check if user is authenticated before making API calls
	 */
	private async ensureAuthenticated(): Promise<void> {
		if (this.configManager.isAuthEnabled()) {
			const isAuthenticated = await this.authService.isAuthenticated();
			if (!isAuthenticated) {
				throw new Error('Authentication required. Please run: /login');
			}
		}
	}

	async startConversation(
		sessionId: string,
		message: string,
		context?: string,
		modelType: string = 'openai',
		modelVersion: string = 'gpt-3.5-turbo',
	): Promise<void> {
		try {
			await this.ensureAuthenticated();
			this.closeCurrentStream();

			const data = {
				type: 'message',
				content: message,
				model_type: modelType,
				model_version: modelVersion,
				...(context && { context }),
			};



			// Set initial thinking status
			this.onStatusUpdate(true, 'Processing request...', 'thinking');

			const headers = await this.getAuthHeaders();
			headers['Accept'] = 'text/event-stream';

			// Use retry logic for the initial request
			const response = await RetryService.retryFetch(
				`${this.baseURL}/conversations/${sessionId}/stream`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(data),
				},
				{
					...this.retryConfig,
					// Custom retry condition to handle specific API responses
					retryCondition: (error: any) => {
						// Don't retry auth, usage limit, or other client errors
						if (error?.status === 401) {
							return false;
						}
						return NetworkErrorUtils.isRetryableError(error);
					},
				},
				'Start conversation',
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: /login');
				}
				if (response.status === 403) {
					throw new Error('No active subscription found. Please subscribe to continue using the service.');
				}
				if (response.status === 402) {
					throw new Error('Usage limit reached. Please upgrade your plan or wait until the limit resets.');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			await this.handleSSEResponse(response);
		} catch (error) {

			// Clear the loading state when there's an error
			this.onStatusUpdate(false, '', 'idle');
			const networkError = NetworkErrorUtils.fromError(error);
			throw new Error(
				`Failed to start conversation: ${networkError.getUserMessage()}`,
			);
		}
	}


	async submitToolResults(
		toolResult: ToolResult,
		modelType?: string,
		modelVersion?: string,
	): Promise<void> {
		try {
			await this.ensureAuthenticated();
			this.closeCurrentStream();

			// Get model info from default model or use fallback defaults
			let effectiveModelType: string;
			let effectiveModelVersion: string;

			// Always prioritize configured default model unless explicitly overridden
			const defaultModel = this.modelConfigManager.getDefaultModel();


			if (modelType && modelVersion) {
				// Use explicitly provided model parameters (override)
				effectiveModelType = modelType;
				effectiveModelVersion = modelVersion;

			} else if (
				defaultModel &&
				defaultModel.provider &&
				defaultModel.model_name
			) {
				// Use configured default model (preferred)
				effectiveModelType = defaultModel.provider;
				effectiveModelVersion = defaultModel.model_name;

			} else {
				// Fallback to hardcoded defaults only if no default model is configured
				effectiveModelType = 'openai';
				effectiveModelVersion = 'gpt-3.5-turbo';

			}

			const data = {
				type: 'tool_result',
				tool_result: toolResult,
				model_type: effectiveModelType,
				model_version: effectiveModelVersion,
			};



			const headers = await this.getAuthHeaders();
			headers['Accept'] = 'text/event-stream';

			// Use retry logic for the initial request
			const response = await RetryService.retryFetch(
				`${this.baseURL}/conversations/${this.sessionId}/stream`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(data),
				},
				{
					...this.retryConfig,
					// Custom retry condition to handle specific API responses
					retryCondition: (error: any) => {
						// Don't retry auth, usage limit, or other client errors
						if (error?.status === 401) {
							return false;
						}
						return NetworkErrorUtils.isRetryableError(error);
					},
				},
				'Submit tool results',
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			await this.handleSSEResponse(response);
		} catch (error) {

			// Clear the loading state when there's an error
			this.onStatusUpdate(false, '', 'idle');
			const networkError = NetworkErrorUtils.fromError(error);
			throw new Error(
				`Failed to submit tool results: ${networkError.getUserMessage()}`,
			);
		}
	}

	/**
	 * Handle SSE streaming response from fetch
	 */
	private async handleSSEResponse(response: Response): Promise<void> {
		if (!response.body) {
			throw new Error('Response body is null');
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		this.currentStream = reader;

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {

					break;
				}

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE events
				const events = this.parseSSEBuffer(buffer);
				events.forEach(event => this.handleSSEEvent(event));

				// Keep incomplete data in buffer
				const lastNewlineIndex = buffer.lastIndexOf('\n\n');
				if (lastNewlineIndex !== -1) {
					buffer = buffer.substring(lastNewlineIndex + 2);
				}
			}
		} catch (error: any) {
			if (error.name !== 'AbortError') {

				// Clear the loading state when there's a stream error
				this.onStatusUpdate(false, '', 'idle');
				throw error;
			}
		} finally {
			this.currentStream = null;
		}
	}

	/**
	 * Parse SSE buffer into individual events
	 */
	private parseSSEBuffer(
		buffer: string,
	): Array<{ type: string; data: string; parsedData: any }> {
		const events: Array<{ type: string; data: string; parsedData: any }> = [];
		const eventBlocks = buffer.split('\n\n');

		for (const block of eventBlocks) {
			if (!block.trim()) continue;

			const lines = block.split('\n');
			const event: any = {};

			for (const line of lines) {
				if (line.startsWith('event: ')) {
					event.type = line.substring(7);
				} else if (line.startsWith('data: ')) {
					event.data = line.substring(6);
				}
			}

			if (event.type && event.data) {
				try {
					event.parsedData = JSON.parse(event.data);
				} catch (e) {
					// If JSON parsing fails, keep raw data
					event.parsedData = event.data;
				}
				events.push(event);
			}
		}

		return events;
	}

	/**
	 * Convert tool names to user-friendly display names
	 */
	private getToolDisplayName(toolName: string): string {
		const toolDisplayNames: Record<string, string> = {
			shell: 'shell command',
			'read-file': 'file',
			'write-file': 'file',
			search: 'search',
		};

		return toolDisplayNames[toolName] || toolName;
	}

	/**
	 * Handle token usage updates from SSE events
	 */
	private handleTokenUsageUpdate(tokenUsage: any): void {

		this.onTokenUsageUpdate(tokenUsage);
	}

	/**
	 * Handle individual SSE events
	 */
	private handleSSEEvent(event: {
		type: string;
		data: string;
		parsedData: any;
	}): void {


		switch (event.type) {
			case 'assistant.message':

				if (event.parsedData.content) {
					this.onUpdateCallback('Response', event.parsedData.content, 'text');
				}

				// Handle enhanced token usage if present
				if (event.parsedData.token_usage) {
					this.handleTokenUsageUpdate(event.parsedData.token_usage);
				}

				// Set status to idle when we get the final response
				this.onStatusUpdate(false, '', 'idle');
				break;

			case 'tool_call':

				// Update status to show specific tool being requested
				const toolName = this.getToolDisplayName(event.parsedData.name);
				this.onStatusUpdate(true, `Running ${toolName}...`, 'tool');

				if (event.parsedData.token_usage) {
					this.handleTokenUsageUpdate(event.parsedData.token_usage);
				}

				this.setToolRequest({
					id: event.parsedData.id,
					name: event.parsedData.name,
					args: event.parsedData.args,
					approved: false,
				});
				break;

			case 'done':

				// Set status to idle when conversation is complete
				this.onStatusUpdate(false, '', 'idle');
				break;

			case 'error':

				throw new Error(event.parsedData.error || 'Server error');

			default:

		}
	}

	/**
	 * Close current streaming connection
	 */
	private closeCurrentStream(): void {
		if (this.currentStream) {
			try {
				this.currentStream.cancel();
			} catch (error) {

			}
			this.currentStream = null;
		}
	}

	/**
	 * Cleanup resources
	 */
	public destroy(): void {
		this.closeCurrentStream();
		this.onUpdateCallback = () => { };
		this.setToolRequest = () => { };
	}

	async getConversationStatus(sessionId: string): Promise<ConversationStatus> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();
			delete headers['Content-Type'];

			const response = await RetryService.retryFetch(
				`${this.baseURL}/conversations/${sessionId}`,
				{ headers },
				this.retryConfig,
				'Get conversation status',
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: /login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			const networkError = NetworkErrorUtils.fromError(error);
			throw new Error(
				`Failed to get conversation status: ${networkError.getUserMessage()}`,
			);
		}
	}

	// Model Management API Methods

	async getAllModels(): Promise<ModelsResponse> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();
			delete headers['Content-Type'];

			const response = await fetch(`${this.baseURL}/models`, { headers });

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			throw new Error(`Failed to get all models: ${error}`);
		}
	}

	async getModelsByProvider(provider: string): Promise<ModelsResponse> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();
			delete headers['Content-Type'];

			const response = await fetch(`${this.baseURL}/models/${provider}`, {
				headers,
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			throw new Error(
				`Failed to get models for provider ${provider}: ${error}`,
			);
		}
	}

	async getSpecificModel(
		provider: string,
		modelName: string,
	): Promise<ModelsResponse> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();
			delete headers['Content-Type'];

			const response = await fetch(
				`${this.baseURL}/models/${provider}/${modelName}`,
				{ headers },
			);

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			throw new Error(
				`Failed to get model ${modelName} from provider ${provider}: ${error}`,
			);
		}
	}

	async validateModel(
		modelType: string,
		modelVersion: string,
	): Promise<ModelsResponse> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();

			const response = await fetch(`${this.baseURL}/models/validate`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					model_type: modelType,
					model_version: modelVersion,
				}),
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			throw new Error(`Failed to validate model: ${error}`);
		}
	}

	async getPricingComparison(): Promise<ModelsResponse> {
		try {
			await this.ensureAuthenticated();
			const headers = await this.getAuthHeaders();
			delete headers['Content-Type'];

			const response = await fetch(`${this.baseURL}/models/pricing`, { headers });

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error('Authentication failed. Please run: octopus login');
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			throw new Error(`Failed to get pricing comparison: ${error}`);
		}
	}

}
