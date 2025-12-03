const ModelDefinitions = {
	openai: {
		provider_name: 'openai',
		models: {
			'gpt-5': {
				name: 'gpt-5',
				display_name: 'GPT-5',
				context_length: 400000,
				input_cost_per_1k: 0.00125,
				output_cost_per_1k: 0.01,
				supports_tools: true,
				max_output_tokens: 128000,
				description:
					"OpenAI's most advanced model with superior reasoning capabilities",
			},
			'gpt-5-codex': {
				name: 'gpt-5-codex',
				display_name: 'GPT-5 Codex',
				context_length: 400000,
				input_cost_per_1k: 0.00125,
				output_cost_per_1k: 0.01,
				supports_tools: true,
				max_output_tokens: 128000,
				description: 'A version of GPT-5 optimized for agentic coding in Codex',
			},
			'gpt-5-mini': {
				name: 'gpt-5-mini',
				display_name: 'GPT-5 Mini',
				context_length: 400000,
				input_cost_per_1k: 0.00025,
				output_cost_per_1k: 0.002,
				supports_tools: true,
				max_output_tokens: 128000,
				description:
					'A faster, cost-efficient version of GPT-5 for well-defined tasks',
			},
			'gpt-5-nano': {
				name: 'gpt-5-nano',
				display_name: 'GPT-5 Nano',
				context_length: 400000,
				input_cost_per_1k: 0.00005,
				output_cost_per_1k: 0.0004,
				supports_tools: true,
				max_output_tokens: 128000,
				description: 'Fastest, most cost-efficient version of GPT-5',
			},
			'gpt-5-pro': {
				name: 'gpt-5-pro',
				display_name: 'GPT-5 Pro',
				context_length: 400000,
				input_cost_per_1k: 0.015,
				output_cost_per_1k: 0.12,
				supports_tools: true,
				max_output_tokens: 272000,
				description:
					'Version of GPT-5 that produces smarter and more precise responses',
			},
		},
	},
	anthropic: {
		provider_name: 'anthropic',
		models: {
			'claude-4-1-opus': {
				name: 'claude-4-1-opus',
				display_name: 'Claude 4.1 Opus',
				context_length: 200000,
				input_cost_per_1k: 0.015,
				output_cost_per_1k: 0.075,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Most intelligent model, best for complex reasoning and coding tasks',
			},
			'claude-4-opus': {
				name: 'claude-4-opus',
				display_name: 'Claude 4 Opus',
				context_length: 200000,
				input_cost_per_1k: 0.015,
				output_cost_per_1k: 0.075,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Most intelligent model, best for complex reasoning and coding tasks',
			},
			'claude-4-5-sonnet': {
				name: 'claude-4-5-sonnet',
				display_name: 'Claude 4.5 Sonnet',
				context_length: 200000,
				input_cost_per_1k: 0.003,
				output_cost_per_1k: 0.015,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Most intelligent model, best for complex reasoning and coding tasks',
			},
			'claude-4-sonnet': {
				name: 'claude-4-sonnet',
				display_name: 'Claude 4 Sonnet',
				context_length: 200000,
				input_cost_per_1k: 0.003,
				output_cost_per_1k: 0.015,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Most intelligent model, best for complex reasoning and coding tasks',
			},
			'claude-4-5-haiku': {
				name: 'claude-4-5-haiku',
				display_name: 'Claude 4.5 Haiku',
				context_length: 200000,
				input_cost_per_1k: 0.001,
				output_cost_per_1k: 0.005,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Fastest and most cost-effective model, good for simple tasks',
			},
			'claude-4-3-haiku': {
				name: 'claude-4-5-haiku',
				display_name: 'Claude 4.5 Haiku',
				context_length: 200000,
				input_cost_per_1k: 0.0008,
				output_cost_per_1k: 0.004,
				supports_tools: true,
				max_output_tokens: 8000,
				description:
					'Fastest and most cost-effective model, good for simple tasks',
			},
		},
	},
	google: {
		provider_name: 'google',
		models: {
			'gemini-3-pro-preview': {
				name: 'gemini-3-pro-preview',
				display_name: 'Gemini 3 Pro',
				context_length: 1048576,
				input_cost_per_1k: 0.0025,
				output_cost_per_1k: 0.015,
				supports_tools: true,
				max_output_tokens: 65536,
				description:
					"Google's most capable model with very large context window",
			},
			'gemini-2.5-pro': {
				name: 'gemini-2.5-pro',
				display_name: 'Gemini 2.5 Pro',
				context_length: 200000,
				input_cost_per_1k: 0.0025,
				output_cost_per_1k: 0.015,
				supports_tools: true,
				max_output_tokens: 200000,
				description:
					"Google's one of the most capable model with very large context window",
			},
			'gemini-2.5-flash': {
				name: 'gemini-2.5-flash',
				display_name: 'Gemini 2.5 Flash',
				context_length: 200000,
				input_cost_per_1k: 0.0003,
				output_cost_per_1k: 0.0025,
				supports_tools: true,
				max_output_tokens: 200000,
				description:
					"Google's most capable model with very large context window",
			},
		},
	},
	grok: {
		provider_name: 'grok',
		models: {
			'grok-code-fast-1': {
				name: 'grok-code-fast-1',
				display_name: 'Grok code fast',
				context_length: 256000,
				input_cost_per_1k: 0.0002,
				output_cost_per_1k: 0.0015,
				supports_tools: true,
				max_output_tokens: 2000000,
				description:
					'Speedy and economical reasoning model that excels at agentic coding',
			},
			'grok-4-fast-reasoning': {
				name: 'grok-4-fast-reasoning',
				display_name: 'Grok 4 fast reasoning',
				context_length: 2000000,
				input_cost_per_1k: 0.0002,
				output_cost_per_1k: 0.0005,
				supports_tools: true,
				max_output_tokens: 2000000,
				description: 'Advancement in cost-efficient reasoning models',
			},
			'grok-4-fast-non-reasoning': {
				name: 'grok-4-fast-non-reasoning',
				display_name: 'Grok 4 fast non reasoning',
				context_length: 2000000,
				input_cost_per_1k: 0.0002,
				output_cost_per_1k: 0.0005,
				supports_tools: true,
				max_output_tokens: 2000000,
				description: 'Advancement in cost-efficient non reasoning models',
			},
		},
	},
};

export default ModelDefinitions;
