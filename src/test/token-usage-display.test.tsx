import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import TokenUsageDisplay from '../ui/components/TokenUsageDisplay.js';

test('TokenUsageDisplay renders nothing when no data', t => {
	const {lastFrame} = render(<TokenUsageDisplay />);
	t.is(lastFrame(), '');
});

test('TokenUsageDisplay renders token usage', t => {
	const usage = {
		input_tokens: 100,
		output_tokens: 200,
		total_tokens: 300,
		tool_tokens: 0,
		source: 'api',
		has_actual_usage: true,
	};

	const {lastFrame} = render(<TokenUsageDisplay tokenUsage={usage} />);
	t.true(lastFrame()?.includes('100 → 200 → 300 total'));
});

test('TokenUsageDisplay renders session total', t => {
	const total = {
		total_tokens: 5000,
	};

	const {lastFrame} = render(<TokenUsageDisplay sessionTotal={total} />);
	t.true(lastFrame()?.includes('5.0K tokens'));
});

test('TokenUsageDisplay renders compact mode', t => {
	const usage = {
		input_tokens: 1000,
		output_tokens: 2000,
		total_tokens: 3000,
		tool_tokens: 500,
		source: 'api',
		has_actual_usage: true,
	};

	const {lastFrame} = render(
		<TokenUsageDisplay tokenUsage={usage} compact={true} />,
	);
	t.true(lastFrame()?.includes('1.0K → 2.0K'));
	t.true(lastFrame()?.includes('(+500 tools)'));
});
