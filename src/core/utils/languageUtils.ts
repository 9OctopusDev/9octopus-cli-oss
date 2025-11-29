import * as path from 'path';

export type SupportedLanguage =
	| 'typescript'
	| 'javascript'
	| 'tsx'
	| 'jsx'
	| 'python'
	| 'rust'
	| 'go'
	| 'java'
	| 'c'
	| 'cpp'
	| 'json'
	| 'yaml'
	| 'markdown'
	| 'html'
	| 'css'
	| 'shell'
	| 'dockerfile'
	| 'sql'
	| 'xml'
	| 'text';

export interface LanguageInfo {
	language: SupportedLanguage;
	displayName: string;
	category: 'code' | 'config' | 'data' | 'markup' | 'script' | 'text';
	isHighRisk: boolean;
}

/**
 * Detect programming language from file path
 */
export function detectLanguage(filePath: string): LanguageInfo {
	const ext = path.extname(filePath).toLowerCase();
	const fileName = path.basename(filePath).toLowerCase();

	// Special files
	const specialFiles: Record<string, LanguageInfo> = {
		dockerfile: {
			language: 'dockerfile',
			displayName: 'Dockerfile',
			category: 'config',
			isHighRisk: true,
		},
		'docker-compose.yml': {
			language: 'yaml',
			displayName: 'Docker Compose',
			category: 'config',
			isHighRisk: true,
		},
		'docker-compose.yaml': {
			language: 'yaml',
			displayName: 'Docker Compose',
			category: 'config',
			isHighRisk: true,
		},
		'package.json': {
			language: 'json',
			displayName: 'NPM Package',
			category: 'config',
			isHighRisk: true,
		},
		'tsconfig.json': {
			language: 'json',
			displayName: 'TypeScript Config',
			category: 'config',
			isHighRisk: true,
		},
		'webpack.config.js': {
			language: 'javascript',
			displayName: 'Webpack Config',
			category: 'config',
			isHighRisk: true,
		},
		'vite.config.js': {
			language: 'javascript',
			displayName: 'Vite Config',
			category: 'config',
			isHighRisk: true,
		},
		'cargo.toml': {
			language: 'text',
			displayName: 'Cargo Config',
			category: 'config',
			isHighRisk: true,
		},
		'requirements.txt': {
			language: 'text',
			displayName: 'Python Requirements',
			category: 'config',
			isHighRisk: false,
		},
		'readme.md': {
			language: 'markdown',
			displayName: 'README',
			category: 'markup',
			isHighRisk: false,
		},
		'.env': {
			language: 'text',
			displayName: 'Environment Variables',
			category: 'config',
			isHighRisk: true,
		},
		'.gitignore': {
			language: 'text',
			displayName: 'Git Ignore',
			category: 'config',
			isHighRisk: false,
		},
	};

	if (specialFiles[fileName]) {
		return specialFiles[fileName];
	}

	// Extension-based detection
	const extensionMap: Record<string, LanguageInfo> = {
		'.ts': {
			language: 'typescript',
			displayName: 'TypeScript',
			category: 'code',
			isHighRisk: false,
		},
		'.tsx': {
			language: 'tsx',
			displayName: 'TypeScript React',
			category: 'code',
			isHighRisk: false,
		},
		'.js': {
			language: 'javascript',
			displayName: 'JavaScript',
			category: 'code',
			isHighRisk: false,
		},
		'.jsx': {
			language: 'jsx',
			displayName: 'JavaScript React',
			category: 'code',
			isHighRisk: false,
		},
		'.mjs': {
			language: 'javascript',
			displayName: 'ES Module',
			category: 'code',
			isHighRisk: false,
		},
		'.py': {
			language: 'python',
			displayName: 'Python',
			category: 'code',
			isHighRisk: false,
		},
		'.rs': {
			language: 'rust',
			displayName: 'Rust',
			category: 'code',
			isHighRisk: false,
		},
		'.go': {
			language: 'go',
			displayName: 'Go',
			category: 'code',
			isHighRisk: false,
		},
		'.java': {
			language: 'java',
			displayName: 'Java',
			category: 'code',
			isHighRisk: false,
		},
		'.c': {
			language: 'c',
			displayName: 'C',
			category: 'code',
			isHighRisk: false,
		},
		'.cpp': {
			language: 'cpp',
			displayName: 'C++',
			category: 'code',
			isHighRisk: false,
		},
		'.cc': {
			language: 'cpp',
			displayName: 'C++',
			category: 'code',
			isHighRisk: false,
		},
		'.cxx': {
			language: 'cpp',
			displayName: 'C++',
			category: 'code',
			isHighRisk: false,
		},
		'.h': {
			language: 'c',
			displayName: 'C Header',
			category: 'code',
			isHighRisk: false,
		},
		'.hpp': {
			language: 'cpp',
			displayName: 'C++ Header',
			category: 'code',
			isHighRisk: false,
		},
		'.json': {
			language: 'json',
			displayName: 'JSON',
			category: 'data',
			isHighRisk: false,
		},
		'.yaml': {
			language: 'yaml',
			displayName: 'YAML',
			category: 'config',
			isHighRisk: false,
		},
		'.yml': {
			language: 'yaml',
			displayName: 'YAML',
			category: 'config',
			isHighRisk: false,
		},
		'.md': {
			language: 'markdown',
			displayName: 'Markdown',
			category: 'markup',
			isHighRisk: false,
		},
		'.html': {
			language: 'html',
			displayName: 'HTML',
			category: 'markup',
			isHighRisk: false,
		},
		'.htm': {
			language: 'html',
			displayName: 'HTML',
			category: 'markup',
			isHighRisk: false,
		},
		'.css': {
			language: 'css',
			displayName: 'CSS',
			category: 'markup',
			isHighRisk: false,
		},
		'.scss': {
			language: 'css',
			displayName: 'SCSS',
			category: 'markup',
			isHighRisk: false,
		},
		'.sass': {
			language: 'css',
			displayName: 'SASS',
			category: 'markup',
			isHighRisk: false,
		},
		'.sh': {
			language: 'shell',
			displayName: 'Shell Script',
			category: 'script',
			isHighRisk: true,
		},
		'.bash': {
			language: 'shell',
			displayName: 'Bash Script',
			category: 'script',
			isHighRisk: true,
		},
		'.zsh': {
			language: 'shell',
			displayName: 'Zsh Script',
			category: 'script',
			isHighRisk: true,
		},
		'.fish': {
			language: 'shell',
			displayName: 'Fish Script',
			category: 'script',
			isHighRisk: true,
		},
		'.ps1': {
			language: 'shell',
			displayName: 'PowerShell',
			category: 'script',
			isHighRisk: true,
		},
		'.sql': {
			language: 'sql',
			displayName: 'SQL',
			category: 'data',
			isHighRisk: true,
		},
		'.xml': {
			language: 'xml',
			displayName: 'XML',
			category: 'markup',
			isHighRisk: false,
		},
		'.toml': {
			language: 'text',
			displayName: 'TOML',
			category: 'config',
			isHighRisk: false,
		},
		'.ini': {
			language: 'text',
			displayName: 'INI',
			category: 'config',
			isHighRisk: false,
		},
		'.conf': {
			language: 'text',
			displayName: 'Config',
			category: 'config',
			isHighRisk: false,
		},
		'.log': {
			language: 'text',
			displayName: 'Log File',
			category: 'text',
			isHighRisk: false,
		},
		'.txt': {
			language: 'text',
			displayName: 'Text',
			category: 'text',
			isHighRisk: false,
		},
	};

	if (extensionMap[ext]) {
		return extensionMap[ext];
	}

	// Default fallback
	return {
		language: 'text',
		displayName: 'Plain Text',
		category: 'text',
		isHighRisk: false,
	};
}

/**
 * Get syntax highlighting color for different token types
 */
export function getSyntaxColor(
	token: string,
	_language: SupportedLanguage,
): string {
	const colorMap: Record<string, string> = {
		// Keywords
		keyword: 'magenta',
		// Strings
		string: 'green',
		// Comments
		comment: 'gray',
		// Numbers
		number: 'cyan',
		// Functions
		function: 'blue',
		// Variables
		variable: 'white',
		// Operators
		operator: 'yellow',
		// Default
		default: 'white',
	};

	return (colorMap[token] || colorMap['default']) as string;
}

/**
 * Basic syntax highlighting detection
 */
export function detectSyntaxTokens(
	line: string,
	language: SupportedLanguage,
): Array<{text: string; type: string}> {
	// Simple tokenization for common patterns
	switch (language) {
		case 'javascript':
		case 'typescript':
		case 'jsx':
		case 'tsx':
			return tokenizeJavaScript(line);
		case 'python':
			return tokenizePython(line);
		case 'json':
			return tokenizeJSON(line);
		case 'shell':
			return tokenizeShell(line);
		default:
			return [{text: line, type: 'default'}];
	}
}

function tokenizeJavaScript(line: string): Array<{text: string; type: string}> {
	const tokens: Array<{text: string; type: string}> = [];
	const keywords = [
		'const',
		'let',
		'var',
		'function',
		'class',
		'if',
		'else',
		'for',
		'while',
		'return',
		'import',
		'export',
		'from',
		'as',
		'default',
		'async',
		'await',
		'try',
		'catch',
		'throw',
	];

	// Simple regex-based tokenization
	const regex =
		/(\w+|["'][^"']*["']|\/\/.*|\/\*[\s\S]*?\*\/|[{}();,=+\-*/<>!&|])/g;
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(line)) !== null) {
		// Add any text before this match
		if (match.index > lastIndex) {
			tokens.push({text: line.slice(lastIndex, match.index), type: 'default'});
		}

		const token = match[0];
		let type = 'default';

		if (keywords.includes(token)) {
			type = 'keyword';
		} else if (
			token.match(/^["']/) ||
			token.startsWith('//') ||
			token.startsWith('/*')
		) {
			type =
				token.startsWith('//') || token.startsWith('/*') ? 'comment' : 'string';
		} else if (token.match(/^\d/)) {
			type = 'number';
		} else if (token.match(/^[{}();,=+\-*/<>!&|]/)) {
			type = 'operator';
		}

		tokens.push({text: token, type});
		lastIndex = regex.lastIndex;
	}

	// Add any remaining text
	if (lastIndex < line.length) {
		tokens.push({text: line.slice(lastIndex), type: 'default'});
	}

	return tokens;
}

function tokenizePython(line: string): Array<{text: string; type: string}> {
	const keywords = [
		'def',
		'class',
		'if',
		'elif',
		'else',
		'for',
		'while',
		'return',
		'import',
		'from',
		'as',
		'try',
		'except',
		'finally',
		'with',
		'lambda',
		'and',
		'or',
		'not',
		'in',
		'is',
	];

	const regex = /(\w+|["'][^"']*["']|#.*|[{}();,=+\-*/<>!&|])/g;
	const tokens: Array<{text: string; type: string}> = [];
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			tokens.push({text: line.slice(lastIndex, match.index), type: 'default'});
		}

		const token = match[0];
		let type = 'default';

		if (keywords.includes(token)) {
			type = 'keyword';
		} else if (token.match(/^["']/) || token.startsWith('#')) {
			type = token.startsWith('#') ? 'comment' : 'string';
		} else if (token.match(/^\d/)) {
			type = 'number';
		}

		tokens.push({text: token, type});
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < line.length) {
		tokens.push({text: line.slice(lastIndex), type: 'default'});
	}

	return tokens;
}

function tokenizeJSON(line: string): Array<{text: string; type: string}> {
	const regex = /(\"[^"]*\"|true|false|null|\d+\.?\d*|[{}[\],:])/g;
	const tokens: Array<{text: string; type: string}> = [];
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			tokens.push({text: line.slice(lastIndex, match.index), type: 'default'});
		}

		const token = match[0];
		let type = 'default';

		if (token.match(/^"/)) {
			type = 'string';
		} else if (token.match(/^(true|false|null)$/)) {
			type = 'keyword';
		} else if (token.match(/^\d/)) {
			type = 'number';
		} else if (token.match(/^[{}[\],:]/)) {
			type = 'operator';
		}

		tokens.push({text: token, type});
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < line.length) {
		tokens.push({text: line.slice(lastIndex), type: 'default'});
	}

	return tokens;
}

function tokenizeShell(line: string): Array<{text: string; type: string}> {
	const keywords = [
		'if',
		'then',
		'else',
		'elif',
		'fi',
		'for',
		'do',
		'done',
		'while',
		'case',
		'esac',
		'function',
		'return',
		'exit',
		'export',
		'source',
		'echo',
		'cd',
		'ls',
		'mkdir',
		'rm',
		'cp',
		'mv',
	];

	const regex = /(\w+|["'][^"']*["']|#.*|\$\w+|\$\{[^}]*\}|[|&;()<>])/g;
	const tokens: Array<{text: string; type: string}> = [];
	let lastIndex = 0;
	let match;

	while ((match = regex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			tokens.push({text: line.slice(lastIndex, match.index), type: 'default'});
		}

		const token = match[0];
		let type = 'default';

		if (keywords.includes(token)) {
			type = 'keyword';
		} else if (token.match(/^["']/) || token.startsWith('#')) {
			type = token.startsWith('#') ? 'comment' : 'string';
		} else if (token.startsWith('$')) {
			type = 'variable';
		} else if (token.match(/^[|&;()<>]/)) {
			type = 'operator';
		}

		tokens.push({text: token, type});
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < line.length) {
		tokens.push({text: line.slice(lastIndex), type: 'default'});
	}

	return tokens;
}
