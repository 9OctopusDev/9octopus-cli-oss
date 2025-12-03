import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import HistoryComponent from '../ui/components/HistoryComponent.js';
import {ConversationMessage} from '../types/converstionTypes.js';

test('HistoryComponent renders user message', t => {
	const history: ConversationMessage[] = [
		{
			id: '1',
			role: 'user',
			content: 'Hello AI',
			timestamp: new Date('2023-01-01T12:00:00'),
		},
	];

	const {lastFrame} = render(<HistoryComponent history={history} />);
	t.true(lastFrame()?.includes('USER'));
	t.true(lastFrame()?.includes('Hello AI'));
});

test('HistoryComponent renders assistant message with markdown', t => {
	const history: ConversationMessage[] = [
		{
			id: '2',
			role: 'assistant',
			content: '**Bold** response',
			timestamp: new Date('2023-01-01T12:01:00'),
		},
	];

	const {lastFrame} = render(<HistoryComponent history={history} />);
	t.true(lastFrame()?.includes('ASSISTANT'));
	// Markdown rendering might vary, but "Bold" should be there
	t.true(lastFrame()?.includes('Bold'));
});

test('HistoryComponent renders system message', t => {
	const history: ConversationMessage[] = [
		{
			id: '3',
			role: 'system',
			content: 'System initialized',
			timestamp: new Date('2023-01-01T12:00:00'),
		},
	];

	const {lastFrame} = render(<HistoryComponent history={history} />);
	t.true(lastFrame()?.includes('SYSTEM'));
	t.true(lastFrame()?.includes('System initialized'));
});
