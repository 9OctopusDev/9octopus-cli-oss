export interface EnhancedTokenUsage {
	input_tokens: number;
	output_tokens: number;
	tool_tokens: number;
	total_tokens: number;
	source: string;
	has_actual_usage: boolean;
	api_calls?: number;
	estimated_cost_usd?: number;
}
