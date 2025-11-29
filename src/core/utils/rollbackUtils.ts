import * as fs from 'fs';
import * as path from 'path';

export interface RollbackSuggestion {
	command: string;
	description: string;
	type: 'automatic' | 'manual' | 'git';
	confidence: 'high' | 'medium' | 'low';
	requirements: string[];
	warnings?: string[];
}

/**
 * Generate rollback suggestions based on tool and arguments
 */
export function generateRollbackSuggestions(
	toolName: string,
	args: Record<string, any>,
): RollbackSuggestion[] {
	switch (toolName) {
		case 'write_file':
			return generateFileRollback(args);
		case 'shell':
			return generateShellRollback(args);
		case 'create_directory':
			return generateDirectoryRollback(args);
		default:
			return generateGenericRollback(toolName, args);
	}
}

/**
 * Generate rollback for file operations
 */
function generateFileRollback(args: Record<string, any>): RollbackSuggestion[] {
	const filePath = args['path'];
	if (!filePath) {
		return [];
	}

	const suggestions: RollbackSuggestion[] = [];
	const absolutePath = path.resolve(filePath);
	const fileExists = fs.existsSync(absolutePath);

	// Git-based rollback (highest confidence)
	suggestions.push({
		command: `git checkout HEAD -- "${filePath}"`,
		description: 'Restore file from git repository',
		type: 'git',
		confidence: 'high',
		requirements: ['Git repository', 'File tracked in git'],
		warnings: ['Will lose all changes since last commit'],
	});

	if (fileExists) {
		// File modification - backup-based rollback
		suggestions.push({
			command: `cp "${filePath}.backup" "${filePath}"`,
			description: 'Restore from backup file (if exists)',
			type: 'manual',
			confidence: 'medium',
			requirements: ['Backup file exists'],
			warnings: ['Backup file must have been created manually'],
		});

		// Manual edit suggestion
		suggestions.push({
			command: `code "${filePath}"`,
			description: 'Manually edit file to revert changes',
			type: 'manual',
			confidence: 'low',
			requirements: ['Text editor (code, vim, nano)'],
			warnings: ['Requires manual identification of changes'],
		});
	} else {
		// File creation - simple deletion
		suggestions.push({
			command: `rm "${filePath}"`,
			description: 'Delete the created file',
			type: 'automatic',
			confidence: 'high',
			requirements: ['Write permissions'],
			warnings: ['File will be permanently deleted'],
		});
	}

	return suggestions;
}

/**
 * Generate rollback for shell commands
 */
function generateShellRollback(
	args: Record<string, any>,
): RollbackSuggestion[] {
	const command = args['command'];
	if (!command || typeof command !== 'string') {
		return [];
	}

	const suggestions: RollbackSuggestion[] = [];

	// Analyze command to suggest appropriate rollback
	const cmd = command.trim().toLowerCase();

	// Directory operations
	if (cmd.startsWith('mkdir ')) {
		const dirPath = command.substring(6).trim().replace(/['"]/g, '');
		suggestions.push({
			command: `rmdir "${dirPath}"`,
			description: 'Remove the created directory',
			type: 'automatic',
			confidence: 'high',
			requirements: ['Directory is empty'],
			warnings: ['Only works if directory is empty'],
		});

		suggestions.push({
			command: `rm -rf "${dirPath}"`,
			description: 'Force remove directory and contents',
			type: 'automatic',
			confidence: 'high',
			requirements: ['Write permissions'],
			warnings: ['⚠️ Will delete all contents permanently'],
		});
	}

	// File copy operations
	else if (cmd.includes('cp ') && !cmd.includes(' -r')) {
		suggestions.push({
			command: 'Manual deletion of copied files',
			description: 'Identify and delete files that were copied',
			type: 'manual',
			confidence: 'low',
			requirements: ['Knowledge of what was copied'],
			warnings: ['Requires manual identification'],
		});
	}

	// File move operations
	else if (cmd.includes('mv ')) {
		const parts = command.split(' ');
		if (parts.length >= 3) {
			const source = parts[1];
			const dest = parts[2];
			suggestions.push({
				command: `mv "${dest}" "${source}"`,
				description: 'Move file back to original location',
				type: 'automatic',
				confidence: 'high',
				requirements: ['Destination file still exists'],
				warnings: ['Only works if move was simple rename'],
			});
		}
	}

	// Package installations
	else if (cmd.includes('npm install') || cmd.includes('yarn add')) {
		const isNpm = cmd.includes('npm');
		const packageName = extractPackageName(command);

		if (packageName) {
			suggestions.push({
				command: isNpm
					? `npm uninstall ${packageName}`
					: `yarn remove ${packageName}`,
				description: 'Uninstall the package',
				type: 'automatic',
				confidence: 'high',
				requirements: ['Package manager available'],
				warnings: ['May affect other dependencies'],
			});
		}

		suggestions.push({
			command: 'git checkout HEAD -- package.json package-lock.json',
			description: 'Restore package files from git',
			type: 'git',
			confidence: 'high',
			requirements: ['Git repository'],
			warnings: ['Will lose all package.json changes'],
		});
	}

	// Service operations
	else if (
		cmd.includes('systemctl start') ||
		(cmd.includes('service ') && cmd.includes(' start'))
	) {
		const serviceName = extractServiceName(command);
		if (serviceName) {
			suggestions.push({
				command: `systemctl stop ${serviceName}`,
				description: 'Stop the service',
				type: 'automatic',
				confidence: 'high',
				requirements: ['Root privileges'],
				warnings: ['Service will be stopped'],
			});
		}
	}

	// Git operations
	else if (cmd.startsWith('git ')) {
		if (cmd.includes('git add')) {
			suggestions.push({
				command: 'git reset HEAD .',
				description: 'Unstage all files',
				type: 'git',
				confidence: 'high',
				requirements: ['Git repository'],
				warnings: ['Will unstage all changes'],
			});
		} else if (cmd.includes('git commit')) {
			suggestions.push({
				command: 'git reset HEAD~1',
				description: 'Undo last commit (keep changes)',
				type: 'git',
				confidence: 'high',
				requirements: ['Git repository'],
				warnings: ['Will undo the last commit'],
			});

			suggestions.push({
				command: 'git reset --hard HEAD~1',
				description: 'Undo last commit (discard changes)',
				type: 'git',
				confidence: 'medium',
				requirements: ['Git repository'],
				warnings: ['⚠️ Will permanently lose changes'],
			});
		}
	}

	// Generic suggestion for unknown commands
	if (suggestions.length === 0) {
		suggestions.push({
			command: 'history | tail -10',
			description: 'Check recent command history',
			type: 'manual',
			confidence: 'low',
			requirements: ['Shell history enabled'],
			warnings: ['Manual analysis required'],
		});

		suggestions.push({
			command: 'git status',
			description: 'Check git status for any changes',
			type: 'git',
			confidence: 'medium',
			requirements: ['Git repository'],
			warnings: ['May not show all system changes'],
		});
	}

	return suggestions;
}

/**
 * Generate rollback for directory creation
 */
function generateDirectoryRollback(
	args: Record<string, any>,
): RollbackSuggestion[] {
	const dirPath = args['path'] || args['dir_path'];
	if (!dirPath) {
		return [];
	}

	return [
		{
			command: `rmdir "${dirPath}"`,
			description: 'Remove the empty directory',
			type: 'automatic',
			confidence: 'high',
			requirements: ['Directory is empty'],
			warnings: ['Only works if directory is empty'],
		},
		{
			command: `rm -rf "${dirPath}"`,
			description: 'Force remove directory and all contents',
			type: 'automatic',
			confidence: 'high',
			requirements: ['Write permissions'],
			warnings: ['⚠️ Will delete all contents permanently'],
		},
	];
}

/**
 * Generate generic rollback suggestions
 */
function generateGenericRollback(
	toolName: string,
	_args: Record<string, any>,
): RollbackSuggestion[] {
	return [
		{
			command: 'git status',
			description: 'Check for any file changes',
			type: 'git',
			confidence: 'medium',
			requirements: ['Git repository'],
			warnings: ['May not detect all changes'],
		},
		{
			command: 'Manual review required',
			description: `Review changes made by ${toolName} tool`,
			type: 'manual',
			confidence: 'low',
			requirements: ['Knowledge of tool effects'],
			warnings: ['Requires manual analysis'],
		},
	];
}

/**
 * Extract package name from npm/yarn command
 */
function extractPackageName(command: string): string | null {
	const parts = command.split(' ');
	const installIndex = parts.findIndex(
		part => part === 'install' || part === 'add',
	);

	if (installIndex !== -1 && installIndex + 1 < parts.length) {
		return parts[installIndex + 1]?.replace(/['"]/g, '') || null;
	}

	return null;
}

/**
 * Extract service name from systemctl/service command
 */
function extractServiceName(command: string): string | null {
	if (command.includes('systemctl')) {
		const parts = command.split(' ');
		const startIndex = parts.findIndex(part => part === 'start');
		if (startIndex !== -1 && startIndex + 1 < parts.length) {
			return parts[startIndex + 1]?.replace(/['"]/g, '') || null;
		}
	} else if (command.includes('service')) {
		const parts = command.split(' ');
		const serviceIndex = parts.findIndex(part => part === 'service');
		if (serviceIndex !== -1 && serviceIndex + 1 < parts.length) {
			return parts[serviceIndex + 1]?.replace(/['"]/g, '') || null;
		}
	}

	return null;
}

/**
 * Get the best rollback suggestion (highest confidence)
 */
export function getBestRollbackSuggestion(
	suggestions: RollbackSuggestion[],
): RollbackSuggestion | null {
	if (suggestions.length === 0) return null;

	// Sort by confidence (high > medium > low)
	const confidenceOrder = {high: 3, medium: 2, low: 1};

	const sorted = suggestions.sort((a, b) => {
		const aScore = confidenceOrder[a.confidence];
		const bScore = confidenceOrder[b.confidence];
		if (aScore !== bScore) return bScore - aScore;

		// Prefer automatic over manual
		if (a.type === 'automatic' && b.type !== 'automatic') return -1;
		if (b.type === 'automatic' && a.type !== 'automatic') return 1;

		return 0;
	});

	return sorted[0] || null;
}
