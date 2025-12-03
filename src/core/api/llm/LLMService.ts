import {
	Tool,
	ToolExecutionRequest,
	ToolResult,
} from '../../../interfaces/tools.js';
import {
	ModelsResponse,
	ConversationStatus,
	TokenUsage,
} from '../../../interfaces/sessions.js';

export interface LLMService {
	startConversation(
		sessionId: string,
		message: string,
		context?: string,
		modelType?: string,
		modelVersion?: string,
		systemPrompt?: string,
		tools?: Tool[],
	): Promise<void>;

	submitToolResults(
		toolResult: ToolResult,
		modelType?: string,
		modelVersion?: string,
	): Promise<void>;

	setOnUpdateCallback(
		callback: (
			action: string,
			details?: string,
			type?: 'text' | 'code' | 'command',
		) => void,
	): void;

	setToolRequestCallback(
		callback: (request: ToolExecutionRequest) => void,
	): void;

	setStatusUpdateCallback(callback: (message: string) => void): void;

	setTokenUsageUpdateCallback(callback: (tokenUsage: TokenUsage) => void): void;

	getConversationStatus(sessionId: string): Promise<ConversationStatus>;

	getAllModels(): Promise<ModelsResponse>;

	getModelsByProvider(provider: string): Promise<ModelsResponse>;

	getSpecificModel(
		provider: string,
		modelName: string,
	): Promise<ModelsResponse>;

	getPricingComparison(): Promise<ModelsResponse>;

	validateModel(
		modelType: string,
		modelVersion: string,
	): Promise<ModelsResponse>;
}
