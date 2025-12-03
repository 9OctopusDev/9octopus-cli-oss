import {LLMService} from '../api/llm/LLMService.js';
import {
	Tool,
	ToolExecutionRequest,
	ToolResult,
} from '../../interfaces/tools.js';

export class ToolManager {
	private tools: Map<string, Tool> = new Map();

	constructor(private llmService: LLMService) {}

	registerTool(tool: Tool): void {
		this.tools.set(tool.name, tool);
	}

	getTool(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	getTools(): Tool[] {
		return Array.from(this.tools.values());
	}

	searchTools(query: string): Tool[] {
		const lowerQuery = query.toLowerCase();
		return this.getTools().filter(
			tool =>
				tool.name.toLowerCase().includes(lowerQuery) ||
				tool.description.toLowerCase().includes(lowerQuery),
		);
	}

	async executeTool(
		name: string,
		args: Record<string, any>,
		toolId: string,
	): Promise<ToolResult> {
		const tool = this.getTool(name);
		if (!tool) {
			return {
				id: toolId,
				name: name,
				ok: false,
				result: {},
				error: `Tool '${name}' not found`,
			};
		}

		// Validate required parameters
		for (const param of tool.parameters) {
			if (param.required && !(param.name in args)) {
				return {
					id: toolId,
					name: name,
					ok: false,
					result: {},
					error: `Missing required parameter: ${param.name}`,
				};
			}
		}

		try {
			const result = await tool.execute(args, toolId);
			return result;
		} catch (error) {
			return {
				id: toolId,
				name: name,
				ok: false,
				result: {},
				error: `Unknown error occurred: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			};
		}
	}

	executeToolRequests(toolExecutionRequest: ToolExecutionRequest) {
		if (toolExecutionRequest.approved) {
			this.executeTool(
				toolExecutionRequest.name,
				toolExecutionRequest.args,
				toolExecutionRequest.id,
			).then(toolResult => this.submitToolResults(toolResult));
		} else {
			// Handle tool denial locally - don't submit to backend
			// The conversation should pause/stop when user denies a tool

			// Tool denial is handled locally in the UI, no need to continue conversation
			return;
		}
	}

	async submitToolResults(toolResult: ToolResult): Promise<void> {
		await this.llmService.submitToolResults(toolResult);
	}
}
