export interface ScrollPosition {
    historyLength: number;
    isAtBottom: boolean;
    lastViewedMessageId?: string;
    savedAt: Date;
}

export interface SessionState {
    sessionId: string;
    isConnected: boolean;
    tokenUsage: TokenUsage;
    toolApprovals: Map<string, boolean>;
    createdAt: Date;
    modelInfo?: ModelInfo;
    messageCount: number;
    scrollPosition?: ScrollPosition;
}

export interface TokenUsage {
    input_tokens: number;
    output_tokens: number;
    tool_tokens: number;
    total_tokens: number;
    api_calls: number;
    estimated_cost_usd: number;
}

export interface BackendUpdate {
    type: string;
    message: string;
    data?: any;
    progress?: number;
    timestamp: string;
    token_usage?: TokenUsage;
}

export interface ToolResult {
    tool_id: string;
    result: {
        approved: boolean;
        stdout?: string;
        stderr?: string;
        return_code?: number;
        content?: string;
        message?: string;
        listing?: string;
        error?: string;
    };
}

export interface ModelInfo {
    provider: string;
    model_name: string;
    display_name: string;
    context_length: number;
    supports_tools: boolean;
}

export interface ModelDetails {
    name: string;
    display_name: string;
    context_length: number;
    input_cost_per_1k: number;
    output_cost_per_1k: number;
    supports_tools: boolean;
    supports_streaming: boolean;
    max_output_tokens: number;
    description: string;
    is_default?: boolean;
}

export interface ModelProvider {
    provider_name: string;
    models: Record<string, ModelDetails>;
    default_model?: string;
    total_models?: number;
}

export interface ModelsResponse {
    status: string;
    data: {
        providers?: Record<string, ModelProvider>;
        provider?: string;
        provider_name?: string;
        models?: Record<string, ModelDetails>;
        model?: ModelDetails;
        total_providers?: number;
        total_models?: number;
        default_model?: string;
        pricing_comparison?: Array<{
            provider: string;
            model_name: string;
            display_name: string;
            input_cost_per_1k: number;
            output_cost_per_1k: number;
            context_length: number;
            cost_effectiveness_ratio: number;
        }>;
        valid?: boolean;
        model_type?: string;
        model_version?: string;
        model_info?: ModelDetails;
        pricing?: {
            input_cost_per_1k_tokens: number;
            output_cost_per_1k_tokens: number;
            currency: string;
        };
        capabilities?: {
            tools: boolean;
            streaming: boolean;
            max_context_tokens: number;
            max_output_tokens: number;
        };
        currency?: string;
        last_updated?: string;
        note?: string;
    };
    message: string;
}

export interface ConversationResponse {
    status: string;
    session_id: string;
    message?: string;
    result?: {
        status: string;
        session_id: string;
        tools?: any[];
        token_usage?: TokenUsage;
    };
}

export interface ConversationStatus {
    session_id: string;
    status: {
        waiting_for_tools: boolean;
        websocket_connected: boolean;
        has_token_data: boolean;
    };
    token_usage: TokenUsage;
    model_info?: ModelInfo;
    waiting_tools: any[];
    timestamp: string;
}
