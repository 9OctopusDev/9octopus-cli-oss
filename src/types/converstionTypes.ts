import { ToolResult } from '../interfaces/tools.js';
import { TokenUsage } from '../interfaces/sessions.js';

export type MessageRole = 'user' | 'assistant' | 'system';

export type ToolCall = {
    id: string;
    name: string;
    args: Record<string, any>;
    result?: ToolResult;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    timestamp: Date;
};

export type ConversationMessage = {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    toolCalls?: ToolCall[];
    tokenUsage?: TokenUsage;
};
