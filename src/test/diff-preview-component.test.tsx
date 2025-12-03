import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import DiffPreview from '../ui/components/DiffPreviewComponent.js';
import {DiffResult} from '../core/utils/diffUtils.js';

test('DiffPreview renders summary when no changes', t => {
	const diff: DiffResult = {
		hasChanges: false,
		lines: [],
		summary: 'No changes',
		riskLevel: 'low',
		riskReasons: [],
		stats: {additions: 0, deletions: 0, modifications: 0},
	};

	const {lastFrame} = render(<DiffPreview diff={diff} />);
	t.true(lastFrame()?.includes('No changes'));
});

test('DiffPreview renders changes', t => {
	const diff: DiffResult = {
		hasChanges: true,
		lines: [
			{type: 'added', content: 'New line', lineNumber: 1},
			{type: 'removed', content: 'Old line', lineNumber: 1},
		],
		summary: '1 addition, 1 deletion',
		riskLevel: 'low',
		riskReasons: [],
		stats: {additions: 1, deletions: 1, modifications: 0},
	};

	const {lastFrame} = render(<DiffPreview diff={diff} collapsible={false} />);
	t.true(lastFrame()?.includes('New line'));
	t.true(lastFrame()?.includes('Old line'));
	t.true(lastFrame()?.includes('+'));
	t.true(lastFrame()?.includes('-'));
});

test('DiffPreview handles collapsed state', t => {
	const diff: DiffResult = {
		hasChanges: true,
		lines: Array(10).fill({type: 'added', content: 'Line', lineNumber: 1}),
		summary: '10 additions',
		riskLevel: 'low',
		riskReasons: [],
		stats: {additions: 10, deletions: 0, modifications: 0},
	};

	const {lastFrame} = render(
		<DiffPreview diff={diff} initiallyCollapsed={true} />,
	);
	t.true(lastFrame()?.includes('lines hidden'));
});
