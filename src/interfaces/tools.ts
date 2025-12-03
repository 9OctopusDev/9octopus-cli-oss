export interface ToolResultError {
	code: string;
	message: string;
	retryable: boolean;
}

export interface ToolResult {
	id: string;
	name: string;
	ok: boolean;
	result: object;
	error?: string;
}

export interface ToolParameter {
	name: string;
	type: 'string' | 'number' | 'boolean';
	required: boolean;
	description: string;
}

export interface Tool {
	name: string;
	description: string;
	parameters: ToolParameter[];
	execute: (args: Record<string, any>, toolId: string) => Promise<ToolResult>;
}

export interface ToolExecutionRequest {
	id: string;
	name: string;
	args: Record<string, any>;
	approved: boolean;
}
