import * as fs from 'fs';
import * as path from 'path';

/**
 * Assess risk level for file operations
 */
function assessFileRisk(
	filePath: string,
	content: string,
	isNewFile: boolean,
): {riskLevel: 'low' | 'medium' | 'high'; reasons: string[]} {
	const reasons: string[] = [];
	let riskLevel: 'low' | 'medium' | 'high' = 'low';

	// Check file type and location
	const ext = path.extname(filePath).toLowerCase();
	const fileName = path.basename(filePath);
	const dirName = path.dirname(filePath);

	// High risk files
	const highRiskExtensions = ['.env', '.key', '.pem', '.crt', '.p12', '.pfx'];
	const highRiskFiles = [
		'package.json',
		'tsconfig.json',
		'webpack.config.js',
		'dockerfile',
	];
	const highRiskDirs = ['node_modules', '.git', 'dist', 'build'];

	if (highRiskExtensions.includes(ext)) {
		riskLevel = 'high';
		reasons.push('Sensitive file type');
	}

	if (highRiskFiles.includes(fileName.toLowerCase())) {
		riskLevel = 'high';
		reasons.push('Critical config file');
	}

	if (highRiskDirs.some(dir => dirName.includes(dir))) {
		riskLevel = 'high';
		reasons.push('System directory');
	}

	// Medium risk patterns
	if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
		if (riskLevel === 'low') riskLevel = 'medium';
		reasons.push('Code file');
	}

	// Content-based risk assessment
	const dangerousPatterns = [
		/process\.env/gi,
		/password|secret|token|key/gi,
		/eval\(/gi,
		/exec\(/gi,
		/require\(['"][^'"]*shell/gi,
		/rm\s+-rf/gi,
		/sudo/gi,
	];

	const dangerousMatches = dangerousPatterns.filter(pattern =>
		pattern.test(content),
	);
	if (dangerousMatches.length > 0) {
		riskLevel = 'high';
		reasons.push(`${dangerousMatches.length} dangerous pattern(s)`);
	}

	// File size risk
	if (content.length > 10000) {
		if (riskLevel === 'low') riskLevel = 'medium';
		reasons.push('Large file');
	}

	if (isNewFile) {
		reasons.push('New file creation');
	}

	if (reasons.length === 0) {
		reasons.push('Standard operation');
	}

	return {riskLevel, reasons};
}

/**
 * Assess risk for shell commands
 */
function assessShellRisk(command: string): {
	riskLevel: 'low' | 'medium' | 'high';
	reasons: string[];
} {
	const reasons: string[] = [];
	let riskLevel: 'low' | 'medium' | 'high' = 'low';

	const highRiskPatterns = [
		{pattern: /rm\s+-rf/i, reason: 'Recursive delete'},
		{pattern: /sudo/i, reason: 'Elevated privileges'},
		{pattern: /su\s/i, reason: 'User switching'},
		{pattern: /passwd/i, reason: 'Password modification'},
		{pattern: /dd\s+if=/i, reason: 'Disk operations'},
		{pattern: /format/i, reason: 'Disk formatting'},
		{pattern: /mkfs/i, reason: 'Filesystem creation'},
		{pattern: /fdisk/i, reason: 'Disk partitioning'},
		{pattern: /crontab/i, reason: 'Scheduled tasks'},
		{pattern: /chmod\s+777/i, reason: 'Unsafe permissions'},
		{pattern: />\s*\/dev/i, reason: 'Device write'},
	];

	const mediumRiskPatterns = [
		{pattern: /rm\s+[^-]/i, reason: 'File deletion'},
		{pattern: /mv\s+.*\/dev\/null/i, reason: 'Data disposal'},
		{pattern: /kill\s+-9/i, reason: 'Force kill'},
		{pattern: /pkill/i, reason: 'Process termination'},
		{pattern: /systemctl/i, reason: 'System service'},
		{pattern: /service\s+/i, reason: 'Service management'},
		{pattern: /iptables/i, reason: 'Firewall changes'},
		{pattern: /mount/i, reason: 'Filesystem mounting'},
	];

	// Check high risk patterns
	for (const {pattern, reason} of highRiskPatterns) {
		if (pattern.test(command)) {
			riskLevel = 'high';
			reasons.push(reason);
		}
	}

	// Check medium risk patterns if not already high risk
	if (riskLevel === 'low') {
		for (const {pattern, reason} of mediumRiskPatterns) {
			if (pattern.test(command)) {
				riskLevel = 'medium';
				reasons.push(reason);
			}
		}
	}

	// Command length and complexity
	if (command.length > 100) {
		if (riskLevel === 'low') riskLevel = 'medium';
		reasons.push('Complex command');
	}

	if (
		command.includes('&&') ||
		command.includes('||') ||
		command.includes(';')
	) {
		if (riskLevel === 'low') riskLevel = 'medium';
		reasons.push('Chained operations');
	}

	if (reasons.length === 0) {
		reasons.push('Standard command');
	}

	return {riskLevel, reasons};
}

export interface DiffLine {
	type: 'added' | 'removed' | 'unchanged' | 'info';
	content: string;
	lineNumber?: number;
}

export interface DiffResult {
	hasChanges: boolean;
	lines: DiffLine[];
	summary: string;
	riskLevel: 'low' | 'medium' | 'high';
	riskReasons: string[];
	stats: {
		additions: number;
		deletions: number;
		modifications: number;
	};
}

/**
 * Generate a simple diff for file operations
 */
export function generateFileDiff(
	filePath: string,
	newContent: string,
): DiffResult {
	try {
		const absolutePath = path.resolve(filePath);
		const fileExists = fs.existsSync(absolutePath);

		if (!fileExists) {
			// New file creation
			const lines = newContent.split('\n');
			const diffLines: DiffLine[] = [
				{
					type: 'info',
					content: `+++ ${filePath} (new file)`,
				},
				...lines.map((line, index) => ({
					type: 'added' as const,
					content: line,
					lineNumber: index + 1,
				})),
			];

			const risk = assessFileRisk(filePath, newContent, true);

			return {
				hasChanges: true,
				lines: diffLines,
				summary: `Creating new file with ${lines.length} lines`,
				riskLevel: risk.riskLevel,
				riskReasons: risk.reasons,
				stats: {
					additions: lines.length,
					deletions: 0,
					modifications: 0,
				},
			};
		} else {
			// File modification
			const existingContent = fs.readFileSync(absolutePath, 'utf8');

			if (existingContent === newContent) {
				const risk = assessFileRisk(filePath, newContent, false);
				return {
					hasChanges: false,
					lines: [
						{
							type: 'info',
							content: 'No changes detected',
						},
					],
					summary: 'File content unchanged',
					riskLevel: risk.riskLevel,
					riskReasons: risk.reasons,
					stats: {
						additions: 0,
						deletions: 0,
						modifications: 0,
					},
				};
			}

			const oldLines = existingContent.split('\n');
			const newLines = newContent.split('\n');

			const diffLines: DiffLine[] = [
				{
					type: 'info',
					content: `--- ${filePath} (existing)`,
				},
				{
					type: 'info',
					content: `+++ ${filePath} (modified)`,
				},
			];

			// Simple line-by-line diff (not optimal but functional)
			const maxLines = Math.max(oldLines.length, newLines.length);
			let addedLines = 0;
			let removedLines = 0;

			for (let i = 0; i < maxLines; i++) {
				const oldLine = oldLines[i];
				const newLine = newLines[i];

				if (oldLine !== undefined && newLine !== undefined) {
					if (oldLine !== newLine) {
						// Line changed
						diffLines.push({
							type: 'removed',
							content: oldLine,
							lineNumber: i + 1,
						});
						diffLines.push({
							type: 'added',
							content: newLine,
							lineNumber: i + 1,
						});
						removedLines++;
						addedLines++;
					} else {
						// Line unchanged (show context for first few and last few)
						if (i < 3 || i >= maxLines - 3) {
							diffLines.push({
								type: 'unchanged',
								content: oldLine,
								lineNumber: i + 1,
							});
						}
					}
				} else if (oldLine !== undefined) {
					// Line removed
					diffLines.push({
						type: 'removed',
						content: oldLine,
						lineNumber: i + 1,
					});
					removedLines++;
				} else if (newLine !== undefined) {
					// Line added
					diffLines.push({
						type: 'added',
						content: newLine,
						lineNumber: i + 1,
					});
					addedLines++;
				}
			}

			const risk = assessFileRisk(filePath, newContent, false);

			return {
				hasChanges: true,
				lines: diffLines,
				summary: `${addedLines} additions, ${removedLines} deletions`,
				riskLevel: risk.riskLevel,
				riskReasons: risk.reasons,
				stats: {
					additions: addedLines,
					deletions: removedLines,
					modifications: Math.min(addedLines, removedLines),
				},
			};
		}
	} catch (error) {
		return {
			hasChanges: true,
			lines: [
				{
					type: 'info',
					content: `Error generating diff: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`,
				},
			],
			summary: 'Could not generate diff',
			riskLevel: 'high',
			riskReasons: ['Error occurred'],
			stats: {
				additions: 0,
				deletions: 0,
				modifications: 0,
			},
		};
	}
}

/**
 * Generate preview for shell commands (show command with warning for dangerous operations)
 */
export function generateShellCommandPreview(command: string): DiffResult {
	const risk = assessShellRisk(command);

	return {
		hasChanges: true,
		lines: [
			{
				type: 'info',
				content: '>>> Shell Command Preview',
			},
			{
				type:
					risk.riskLevel === 'high'
						? 'removed'
						: risk.riskLevel === 'medium'
						? 'info'
						: 'added',
				content: command,
			},
			...(risk.riskLevel === 'high'
				? [
						{
							type: 'info' as const,
							content: '⚠️  WARNING: This command may be destructive',
						},
				  ]
				: []),
		],
		summary: `${risk.riskLevel.toUpperCase()} risk shell command`,
		riskLevel: risk.riskLevel,
		riskReasons: risk.reasons,
		stats: {
			additions: 1,
			deletions: 0,
			modifications: 0,
		},
	};
}

/**
 * Generate diff preview based on tool type and arguments
 */
export function generateToolDiff(
	toolName: string,
	args: Record<string, any>,
): DiffResult | null {
	switch (toolName) {
		case 'write_file':
			if (args['path'] && args['content'] !== undefined) {
				return generateFileDiff(args['path'], args['content']);
			}
			break;

		case 'shell':
			if (args['command']) {
				return generateShellCommandPreview(args['command']);
			}
			break;

		case 'create_directory':
			return {
				hasChanges: true,
				lines: [
					{
						type: 'info',
						content: '>>> Directory Creation',
					},
					{
						type: 'added',
						content: `Creating directory: ${
							args['path'] || args['dir_path'] || 'unknown'
						}`,
					},
				],
				summary: 'Directory creation',
				riskLevel: 'low',
				riskReasons: ['Directory creation'],
				stats: {
					additions: 1,
					deletions: 0,
					modifications: 0,
				},
			};

		default:
			return null;
	}

	return null;
}
