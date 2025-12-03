import * as fs from 'fs';
import * as path from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';
import {Tool, ToolResult, ToolParameter} from '../../interfaces/tools.js';

const execAsync = promisify(exec);

export class SearchTool implements Tool {
	name: string = 'search';
	description: string = 'Search for files and content using patterns';
	parameters: ToolParameter[] = [
		{
			name: 'pattern',
			type: 'string',
			required: true,
			description: 'Search pattern for files and content',
		},
	];

	async execute(
		args: Record<string, any>,
		toolId: string,
	): Promise<ToolResult> {
		const {pattern} = args;
		const searchPath = process.cwd();

		try {
			const results: {
				files: string[];
				content: Array<{file: string; line: number; match: string}>;
			} = {
				files: [],
				content: [],
			};

			// Search both files and content
			results.files = await this.searchFiles(pattern as string, searchPath);
			results.content = await this.searchContent(pattern as string, searchPath);

			return {
				id: toolId,
				name: this.name,
				ok: true,
				result: results,
			};
		} catch (error: any) {
			return {
				id: toolId,
				name: this.name,
				ok: false,
				result: {},
				error: `Search failed: ${error.message}`,
			};
		}
	}

	private async searchFiles(
		pattern: string,
		searchPath: string,
	): Promise<string[]> {
		try {
			// Use find command with case-insensitive glob pattern support
			const command = `find "${searchPath}" -iname "*${pattern}*" -type f 2>/dev/null | grep -v node_modules | grep -v .git | head -100`;

			const {stdout} = await execAsync(command);
			return stdout.trim()
				? stdout
						.trim()
						.split('\n')
						.filter(line => line.length > 0)
				: [];
		} catch (error) {
			// If find fails, fallback to simple fs traversal
			return this.searchFilesRecursive(searchPath, pattern);
		}
	}

	private searchFilesRecursive(
		dir: string,
		pattern: string,
		results: string[] = [],
	): string[] {
		try {
			const entries = fs.readdirSync(dir, {withFileTypes: true});

			for (const entry of entries) {
				// Skip common directories that should be excluded
				if (
					entry.isDirectory() &&
					['node_modules', '.git', '.next', 'dist', 'build'].includes(
						entry.name,
					)
				) {
					continue;
				}

				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					if (results.length < 100) {
						// Limit results to prevent overwhelming output
						this.searchFilesRecursive(fullPath, pattern, results);
					}
				} else {
					// Case-insensitive filename matching
					const fileName = entry.name.toLowerCase();
					const searchPattern = pattern.toLowerCase();

					if (fileName.includes(searchPattern)) {
						results.push(fullPath);
					}
				}
			}
		} catch (error) {
			// Skip directories we can't read
		}

		return results;
	}

	private async searchContent(
		pattern: string,
		searchPath: string,
	): Promise<Array<{file: string; line: number; match: string}>> {
		try {
			// Try to use ripgrep first (faster), fallback to grep
			let command: string;
			try {
				await execAsync('which rg');
				command = `rg -i -n --type-not binary "${pattern}" "${searchPath}" 2>/dev/null | head -50`;
			} catch {
				// Fallback to grep with case-insensitive search
				command = `grep -r -i -n --exclude-dir=node_modules --exclude-dir=.git "${pattern}" "${searchPath}" 2>/dev/null | head -50`;
			}

			const {stdout} = await execAsync(command);

			const results: Array<{file: string; line: number; match: string}> = [];
			const lines = stdout
				.trim()
				.split('\n')
				.filter(line => line.length > 0);

			for (const line of lines) {
				const match = line.match(/^([^:]+):(\d+):(.*)$/);
				if (match && match[1] && match[2] && match[3]) {
					results.push({
						file: match[1],
						line: parseInt(match[2], 10),
						match: match[3].trim(),
					});
				}
			}

			return results;
		} catch (error) {
			// Return empty results if content search fails
			return [];
		}
	}
}
