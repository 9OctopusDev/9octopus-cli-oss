import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
	generateFileDiff,
	generateShellCommandPreview,
} from '../core/utils/diffUtils.js';

const tempDir = os.tmpdir();

test('generateFileDiff detects new file creation', t => {
	const filePath = path.join(tempDir, `test-new-${Date.now()}.txt`);
	if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

	const result = generateFileDiff(filePath, 'Hello World');

	t.true(result.hasChanges);
	t.is(result.stats.additions, 1);
	t.true(result.summary.includes('Creating new file'));
});

test('generateFileDiff detects modifications', t => {
	const filePath = path.join(tempDir, `test-mod-${Date.now()}.txt`);
	fs.writeFileSync(filePath, 'Old Content');

	const result = generateFileDiff(filePath, 'New Content');

	t.true(result.hasChanges);
	t.is(result.stats.additions, 1);
	t.is(result.stats.deletions, 1);

	fs.unlinkSync(filePath);
});

test('generateFileDiff detects no changes', t => {
	const filePath = path.join(tempDir, `test-same-${Date.now()}.txt`);
	fs.writeFileSync(filePath, 'Same Content');

	const result = generateFileDiff(filePath, 'Same Content');

	t.false(result.hasChanges);

	fs.unlinkSync(filePath);
});

test('generateShellCommandPreview assesses risk', t => {
	const safeResult = generateShellCommandPreview('ls -la');
	t.is(safeResult.riskLevel, 'low');

	const riskyResult = generateShellCommandPreview('rm -rf /');
	t.is(riskyResult.riskLevel, 'high');
	t.true(riskyResult.riskReasons.includes('Recursive delete'));
});
