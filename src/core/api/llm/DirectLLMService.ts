import {LLMService} from './LLMService.js';
import {
	Tool,
	ToolExecutionRequest,
	ToolResult,
} from '../../../interfaces/tools.js';
import {ChatOpenAI} from '@langchain/openai';
import {ChatAnthropic} from '@langchain/anthropic';
import {
	HumanMessage,
	SystemMessage,
	AIMessage,
	ToolMessage,
} from '@langchain/core/messages';
import {StateGraph, MessagesAnnotation} from '@langchain/langgraph';
import {
	ConversationStatus,
	ModelsResponse,
	TokenUsage,
} from '../../../interfaces/sessions.js';
import ModelDefinitions from './modelDefinitions.js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq"

import 'dotenv/config';

export class DirectLLMService implements LLMService {
	private onUpdateCallback: (
		action: string,
		details?: string,
		type?: 'text' | 'code' | 'command',
	) => void = () => {};
	private onStatusUpdate: (message: string) => void = () => {};
	private onTokenUsageUpdate: (tokenUsage: TokenUsage) => void = () => {};

	private readonly modelDefinitions = ModelDefinitions;

	private messages: any[] = [];

	private onToolRequest: (request: ToolExecutionRequest) => void = () => {};
	private currentModelType: string = 'openai';
	private currentModelVersion: string = 'gpt-3.5-turbo';
	private currentTools: Tool[] = [];

	constructor() {}

	setOnUpdateCallback(
		callback: (
			action: string,
			details?: string,
			type?: 'text' | 'code' | 'command',
		) => void,
	): void {
		this.onUpdateCallback = callback;
	}

	setToolRequestCallback(
		callback: (request: ToolExecutionRequest) => void,
	): void {
		this.onToolRequest = callback;
	}

	setStatusUpdateCallback(callback: (message: string) => void): void {
		this.onStatusUpdate = callback;
	}

	setTokenUsageUpdateCallback(
		callback: (tokenUsage: TokenUsage) => void,
	): void {
		this.onTokenUsageUpdate = callback;
	}

	private calculateCost(
		usage: {input_tokens: number; output_tokens: number},
		modelType: string,
		modelVersion: string,
	): number {
		const provider =
			this.modelDefinitions[modelType as keyof typeof this.modelDefinitions];
		if (!provider) return 0;

		const model = provider.models[modelVersion as keyof typeof provider.models];
		if (!model) return 0;

		const inputCost = (usage.input_tokens / 1000) * 0; //model.input_cost_per_1k;
		const outputCost = (usage.output_tokens / 1000) * 0; // model.output_cost_per_1k;

		return inputCost + outputCost;
	}

	private handleTokenUsage(response: any) {
		if (response?.response_metadata?.tokenUsage) {
			const usage = response.response_metadata.tokenUsage;
			const input_tokens = usage.promptTokens || usage.inputTokens || 0;
			const output_tokens = usage.completionTokens || usage.outputTokens || 0;
			const total_tokens = usage.totalTokens || input_tokens + output_tokens;

			const cost = this.calculateCost(
				{input_tokens, output_tokens},
				this.currentModelType,
				this.currentModelVersion,
			);

			this.onTokenUsageUpdate({
				input_tokens,
				output_tokens,
				tool_tokens: 0, // LangChain doesn't always separate tool tokens clearly in generic usage
				total_tokens,
				api_calls: 1,
				estimated_cost_usd: cost,
			});
		} else if (response?.usage_metadata) {
			// Newer LangChain versions might use usage_metadata
			const usage = response.usage_metadata;
			const input_tokens = usage.input_tokens || 0;
			const output_tokens = usage.output_tokens || 0;
			const total_tokens = usage.total_tokens || input_tokens + output_tokens;

			const cost = this.calculateCost(
				{input_tokens, output_tokens},
				this.currentModelType,
				this.currentModelVersion,
			);

			this.onTokenUsageUpdate({
				input_tokens,
				output_tokens,
				tool_tokens: 0,
				total_tokens,
				api_calls: 1,
				estimated_cost_usd: cost,
			});
		}
	}

	async startConversation(
		_sessionId: string,
		message: string,
		context?: string,
		modelType: string = 'openai',
		modelVersion: string = 'gpt-3.5-turbo',
		systemPrompt?: string,
		tools?: Tool[],
	): Promise<void> {
		this.currentModelType = modelType;
		this.currentModelVersion = modelVersion;
		this.currentTools = tools || [];

		try {
			this.onStatusUpdate('Thinking...');

			let model: any;

			if (this.currentModelType === 'anthropic') {
				const anthropicApiKey = process.env['ANTHROPIC_API_KEY'];
				if (!anthropicApiKey) {
					throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
				}
				model = new ChatAnthropic({
					modelName: this.currentModelVersion,
					anthropicApiKey,
					streaming: true,
				});
			} else if (this.currentModelType === 'openai') {
				const openAIApiKey = process.env['OPENAI_API_KEY'];
				if (!openAIApiKey) {
					throw new Error('OPENAI_API_KEY environment variable is not set.');
				}
				model = new ChatOpenAI({
					modelName: this.currentModelVersion,
					openAIApiKey,
					streaming: true,
				});
			} else if(this.currentModelType === 'google') {
				const googleApiKey = process.env['GOOGLE_API_KEY'];
				if (!googleApiKey) {
					throw new Error('GOOGLE_API_KEY environment variable is not set.');
				}
				model = new ChatGoogleGenerativeAI({
					model: this.currentModelVersion,
					apiKey: googleApiKey,
					streaming: true,
				});
			} else if(this.currentModelType === 'grok'){
				const grokApiKey = process.env['GROK_API_KEY'];
				if (!grokApiKey) {
					throw new Error('GROK_API_KEY environment variable is not set.');
				}
				model = new ChatGroq({
					model: this.currentModelVersion,
					apiKey: grokApiKey,
					streaming: true,
				});
			}
			else {
				throw new Error('Unsupported model type: ' + this.currentModelType);
			}

			if (this.currentTools.length > 0) {
				// Convert our Tool interface to LangChain compatible tools
				// This is a simplified conversion. You might need a more robust adapter.
				const langchainTools = this.currentTools.map(t => ({
					type: 'function',
					function: {
						name: t.name,
						description: t.description,
						parameters: {
							type: 'object',
							properties: t.parameters.reduce((acc, param) => {
								acc[param.name] = {
									type: param.type,
									description: param.description,
								};
								return acc;
							}, {} as Record<string, any>),
							required: t.parameters.filter(p => p.required).map(p => p.name),
						},
					},
				}));
				model = model.bindTools(langchainTools, {parallel_tool_calls: false});
			}

			// Initialize messages if empty
			if (this.messages.length === 0) {
				if (systemPrompt) {
					this.messages.push(new SystemMessage(systemPrompt));
				}
				if (context) {
					this.messages.push(new SystemMessage(`Context:\n${context}`));
				}
			}

			this.messages.push(new HumanMessage(message));

			// Define LangGraph
			const graph = new StateGraph(MessagesAnnotation)
				.addNode('agent', async state => {
					const response = await model.invoke(state.messages);
					return {messages: [response]};
				})
				.addEdge('__start__', 'agent')
				.compile();

			const stream = await graph.stream(
				{messages: this.messages},
				{streamMode: 'messages'},
			);

			let fullResponse = '';

			for await (const [message, _metadata] of stream) {
				if (message instanceof AIMessage && message.content) {
					// const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
					// We need to diff the content to stream only new parts if possible,
					// but LangGraph stream might return full chunks or updates.
					// For simplicity in this initial version, we might just accumulate or check how it streams.
					// Actually, streamMode: "messages" yields chunks of messages.
					// Let's assume we get chunks.
					// Wait, graph.stream with streamMode="messages" yields the final messages or updates?
					// Let's use standard model streaming for better control if graph is simple.
					// But requirement said "use langgraph".
					// If we use graph.stream, we get chunks.
					// Let's try to handle it.
					// Actually, for a simple chat, we might just want to stream the model output directly
					// but wrapped in a graph node.
					// Re-reading: "use langgraph as a framework".
					// So I should use the graph.
				}
			}

			// Alternative: Use model.stream inside the node and yield chunks?
			// Or just use the graph stream.

			// Let's refine the implementation to be simple and robust.
			// We will stream the events from the graph.

			const eventStream = await graph.streamEvents(
				{messages: this.messages},
				{version: 'v2'},
			);

			for await (const {event, data} of eventStream) {
				if (event === 'on_chat_model_stream') {
					if (data.chunk.content) {
						const content = data.chunk.content;

						fullResponse += content;
					}
					if (data.chunk.tool_calls && data.chunk.tool_calls.length > 0) {
						// We might get partial tool calls, but let's wait for the final message to handle them
						// Actually, for streaming tool calls, we might want to notify UI?
						// For now, let's just handle the final message.
					}
				}
			}

			const finalResponse = await model.invoke(this.messages);
			this.messages.push(finalResponse);
			this.handleTokenUsage(finalResponse);

			if (finalResponse.tool_calls && finalResponse.tool_calls.length > 0) {
				for (const toolCall of finalResponse.tool_calls) {
					this.onToolRequest({
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args,
						approved: false,
					});
				}
			} else {
				this.onUpdateCallback(
					'Response',
					typeof fullResponse === 'string'
						? fullResponse
						: JSON.stringify(fullResponse),
					'text',
				);
				this.onStatusUpdate('');
			}
		} catch (error) {
			this.onStatusUpdate('');
			throw error;
		}
	}

	async submitToolResults(
		toolResult: ToolResult,
		_modelType?: string,
		_modelVersion?: string,
	): Promise<void> {
		// Add tool result to messages
		this.messages.push(
			new ToolMessage({
				tool_call_id: toolResult.id,
				content: JSON.stringify(toolResult.result),
				name: toolResult.name,
			}),
		);

		// Continue conversation
		// We need to re-invoke the model with the new history
		// Recursively call startConversation? No, that adds a new HumanMessage.
		// We just need to run the graph/model again.

		// Let's extract the logic to run the model into a helper or just duplicate for now.
		// Since startConversation is designed for user input, let's create a private method or just run logic here.

		try {
			this.onStatusUpdate('Thinking...');

			let model: any;

			if (this.currentModelType === 'anthropic') {
				const anthropicApiKey = process.env['ANTHROPIC_API_KEY'];
				if (!anthropicApiKey) {
					throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
				}
				model = new ChatAnthropic({
					modelName: this.currentModelVersion,
					anthropicApiKey,
					streaming: true,
				});
			} else {
				const openAIApiKey = process.env['OPENAI_API_KEY'];
				if (!openAIApiKey) {
					throw new Error('OPENAI_API_KEY environment variable is not set.');
				}
				model = new ChatOpenAI({
					modelName: this.currentModelVersion,
					openAIApiKey,
					streaming: true,
				});
			}

			if (this.currentTools.length > 0) {
				const langchainTools = this.currentTools.map(t => ({
					type: 'function',
					function: {
						name: t.name,
						description: t.description,
						parameters: {
							type: 'object',
							properties: t.parameters.reduce((acc, param) => {
								acc[param.name] = {
									type: param.type,
									description: param.description,
								};
								return acc;
							}, {} as Record<string, any>),
							required: t.parameters.filter(p => p.required).map(p => p.name),
						},
					},
				}));
				model = model.bindTools(langchainTools, {parallel_tool_calls: false});
			}

			const response = await model.invoke(this.messages);
			this.messages.push(response);
			this.handleTokenUsage(response);

			if (response.content) {
				this.onUpdateCallback(
					'Response',
					typeof response.content === 'string'
						? response.content
						: JSON.stringify(response.content),
					'text',
				);
			}

			if (response.tool_calls && response.tool_calls.length > 0) {
				for (const toolCall of response.tool_calls) {
					this.onToolRequest({
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args,
						approved: false,
					});
				}
			} else {
				this.onStatusUpdate('');
			}
		} catch (error) {
			this.onStatusUpdate('');
			throw error;
		}
	}

	async getConversationStatus(sessionId: string): Promise<ConversationStatus> {
		return {
			session_id: sessionId,
			status: {
				waiting_for_tools: false,
				websocket_connected: true,
				has_token_data: false,
			},
			token_usage: {
				input_tokens: 0,
				output_tokens: 0,
				tool_tokens: 0,
				total_tokens: 0,
				api_calls: 0,
				estimated_cost_usd: 0,
			},
			waiting_tools: [],
			timestamp: new Date().toISOString(),
		};
	}

	async getAllModels(): Promise<ModelsResponse> {
		// Return hardcoded models for now or fetch from OpenAI if possible
		return {
			status: 'success',
			message: 'Models retrieved successfully',
			data: {
				providers: this.modelDefinitions,
			},
		};
	}

	async getModelsByProvider(_provider: string): Promise<ModelsResponse> {
		return this.getAllModels();
	}

	async getSpecificModel(
		provider: string,
		modelName: string,
	): Promise<ModelsResponse> {
		return {
			status: 'success',
			message: 'Model details retrieved',
			data: {
				provider: provider,
				model: {
					name: modelName,
					display_name: modelName,
					description: 'Direct LLM Model',
					context_length: 128000,
					max_output_tokens: 4096,
					is_default: false,
					input_cost_per_1k: 0,
					output_cost_per_1k: 0,
					supports_tools: true,
				},
			},
		};
	}

	async getPricingComparison(): Promise<ModelsResponse> {
		return {
			status: 'success',
			message: 'Pricing comparison',
			data: {
				currency: 'USD',
				last_updated: new Date().toISOString(),
				pricing_comparison: [],
			},
		};
	}

	async validateModel(
		_modelType: string,
		modelVersion: string,
	): Promise<ModelsResponse> {
		return {
			status: 'success',
			message: 'Model validated',
			data: {
				valid: true,
				model_info: {
					name: modelVersion,
					display_name: modelVersion,
					description: 'Direct LLM Model',
					context_length: 4096,
					max_output_tokens: 4096,
					supports_tools: true,
					input_cost_per_1k: 0,
					output_cost_per_1k: 0,
				},
			},
		};
	}
}
