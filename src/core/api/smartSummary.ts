import {DiffResult} from '../utils/diffUtils.js';
import {detectLanguage, LanguageInfo} from '../utils/languageUtils.js';

export interface SmartSummary {
	title: string;
	description: string;
	changeType:
		| 'feature'
		| 'fix'
		| 'refactor'
		| 'config'
		| 'docs'
		| 'test'
		| 'style'
		| 'chore';
	impactLevel: 'minor' | 'moderate' | 'major';
	affectedAreas: string[];
	technicalDetails: string[];
	userFriendlyDescription: string;
}

export interface ChangePattern {
	pattern: RegExp;
	changeType: SmartSummary['changeType'];
	description: string;
	weight: number;
}

/**
 * Generate smart summary from diff result
 */
export function generateSmartSummary(
	diff: DiffResult,
	filePath?: string,
	toolName?: string,
	args?: Record<string, any>,
): SmartSummary {
	const languageInfo = filePath ? detectLanguage(filePath) : null;
	const fileContext = analyzeFileContext(filePath, languageInfo);
	const contentAnalysis = analyzeContentChanges(diff);
	const changeType = determineChangeType(diff, languageInfo, toolName, args);
	const impactLevel = determineImpactLevel(diff, languageInfo, fileContext);

	return {
		title: generateTitle(changeType, fileContext, contentAnalysis),
		description: generateDescription(diff, changeType, contentAnalysis),
		changeType,
		impactLevel,
		affectedAreas: identifyAffectedAreas(diff, languageInfo, fileContext),
		technicalDetails: extractTechnicalDetails(diff, languageInfo),
		userFriendlyDescription: generateUserFriendlyDescription(
			changeType,
			fileContext,
			contentAnalysis,
			diff,
		),
	};
}

/**
 * Analyze file context to understand its purpose
 */
function analyzeFileContext(
	filePath?: string,
	languageInfo?: LanguageInfo | null,
): {
	category: string;
	purpose: string;
	importance: 'low' | 'medium' | 'high';
} {
	if (!filePath || !languageInfo) {
		return {
			category: 'unknown',
			purpose: 'file operation',
			importance: 'medium',
		};
	}

	const fileName = filePath.split('/').pop()?.toLowerCase() || '';
	const directory = filePath.split('/').slice(-2, -1)[0]?.toLowerCase() || '';

	// Determine file importance
	let importance: 'low' | 'medium' | 'high' = 'medium';
	if (languageInfo.isHighRisk) {
		importance = 'high';
	} else if (['src', 'source', 'lib', 'app'].includes(directory)) {
		importance = 'medium';
	} else if (
		['test', 'tests', 'spec', 'docs', 'documentation'].includes(directory)
	) {
		importance = 'low';
	}

	// Determine purpose
	let purpose = 'general file';
	const purposeMap: Record<string, string> = {
		'package.json': 'project dependencies',
		'tsconfig.json': 'TypeScript configuration',
		'webpack.config.js': 'build configuration',
		dockerfile: 'containerization',
		'readme.md': 'project documentation',
		'.env': 'environment variables',
		'.gitignore': 'version control settings',
	};

	if (purposeMap[fileName]) {
		purpose = purposeMap[fileName];
	} else if (languageInfo.category === 'code') {
		if (fileName.includes('test') || fileName.includes('spec')) {
			purpose = 'test code';
		} else if (fileName.includes('component') || fileName.includes('ui')) {
			purpose = 'user interface';
		} else if (fileName.includes('api') || fileName.includes('service')) {
			purpose = 'backend service';
		} else if (fileName.includes('util') || fileName.includes('helper')) {
			purpose = 'utility functions';
		} else {
			purpose = 'application code';
		}
	}

	return {
		category: languageInfo.category,
		purpose,
		importance,
	};
}

/**
 * Analyze content changes to extract patterns
 */
function analyzeContentChanges(diff: DiffResult): {
	addedFunctions: string[];
	removedFunctions: string[];
	modifiedFunctions: string[];
	addedImports: string[];
	removedImports: string[];
	configChanges: string[];
	hasBreakingChanges: boolean;
} {
	const analysis = {
		addedFunctions: [] as string[],
		removedFunctions: [] as string[],
		modifiedFunctions: [] as string[],
		addedImports: [] as string[],
		removedImports: [] as string[],
		configChanges: [] as string[],
		hasBreakingChanges: false,
	};

	const addedLines = diff.lines.filter(line => line.type === 'added');
	const removedLines = diff.lines.filter(line => line.type === 'removed');

	// Function detection patterns
	const functionPatterns = [
		/function\s+(\w+)/,
		/const\s+(\w+)\s*=\s*(\(.*?\)|\w+)\s*=>/,
		/def\s+(\w+)/,
		/class\s+(\w+)/,
		/interface\s+(\w+)/,
		/type\s+(\w+)/,
	];

	// Import patterns
	const importPatterns = [
		/import\s+.*?from\s+['"]([^'"]+)['"]/,
		/import\s+['"]([^'"]+)['"]/,
		/from\s+['"]([^'"]+)['"]\s+import/,
		/require\(['"]([^'"]+)['"]\)/,
	];

	// Analyze added lines
	for (const line of addedLines) {
		// Check for functions
		for (const pattern of functionPatterns) {
			const match = line.content.match(pattern);
			if (match && match[1]) {
				analysis.addedFunctions.push(match[1]);
			}
		}

		// Check for imports
		for (const pattern of importPatterns) {
			const match = line.content.match(pattern);
			if (match && match[1]) {
				analysis.addedImports.push(match[1]);
			}
		}

		// Check for config changes
		if (
			line.content.includes('"version"') ||
			line.content.includes('"dependencies"') ||
			line.content.includes('config') ||
			line.content.includes('settings')
		) {
			analysis.configChanges.push('Configuration updated');
		}

		// Check for breaking changes
		if (
			line.content.includes('BREAKING') ||
			line.content.includes('deprecated') ||
			line.content.includes('removed') ||
			line.content.includes('changed API')
		) {
			analysis.hasBreakingChanges = true;
		}
	}

	// Analyze removed lines (similar logic)
	for (const line of removedLines) {
		for (const pattern of functionPatterns) {
			const match = line.content.match(pattern);
			if (match && match[1]) {
				analysis.removedFunctions.push(match[1]);
			}
		}

		for (const pattern of importPatterns) {
			const match = line.content.match(pattern);
			if (match && match[1]) {
				analysis.removedImports.push(match[1]);
			}
		}
	}

	return analysis;
}

/**
 * Determine change type based on patterns
 */
function determineChangeType(
	diff: DiffResult,
	languageInfo?: LanguageInfo | null,
	toolName?: string,
	args?: Record<string, any>,
): SmartSummary['changeType'] {
	// Tool-based detection
	if (toolName === 'shell') {
		const command = args?.['command'] || '';
		if (
			command.includes('test') ||
			command.includes('jest') ||
			command.includes('pytest')
		) {
			return 'test';
		}
		if (command.includes('build') || command.includes('compile')) {
			return 'chore';
		}
		return 'chore';
	}

	if (toolName === 'create_directory') {
		return 'chore';
	}

	// Content-based detection
	const addedContent = diff.lines
		.filter(line => line.type === 'added')
		.map(line => line.content.toLowerCase())
		.join(' ');

	const removedContent = diff.lines
		.filter(line => line.type === 'removed')
		.map(line => line.content.toLowerCase())
		.join(' ');

	const allContent = addedContent + ' ' + removedContent;

	// Pattern matching
	if (
		allContent.includes('test') ||
		allContent.includes('spec') ||
		allContent.includes('describe') ||
		allContent.includes('it(')
	) {
		return 'test';
	}

	if (
		allContent.includes('fix') ||
		allContent.includes('bug') ||
		allContent.includes('error') ||
		allContent.includes('issue')
	) {
		return 'fix';
	}

	if (
		allContent.includes('add') ||
		allContent.includes('new') ||
		allContent.includes('feature') ||
		allContent.includes('implement')
	) {
		return 'feature';
	}

	if (
		allContent.includes('refactor') ||
		allContent.includes('clean') ||
		allContent.includes('optimize') ||
		allContent.includes('improve')
	) {
		return 'refactor';
	}

	if (
		allContent.includes('style') ||
		allContent.includes('format') ||
		allContent.includes('prettier') ||
		allContent.includes('lint')
	) {
		return 'style';
	}

	if (
		allContent.includes('doc') ||
		allContent.includes('readme') ||
		allContent.includes('comment')
	) {
		return 'docs';
	}

	// File type based
	if (languageInfo?.category === 'config') {
		return 'config';
	}

	// Default based on stats
	if (diff.stats.additions > diff.stats.deletions * 2) {
		return 'feature';
	} else if (diff.stats.deletions > diff.stats.additions * 2) {
		return 'refactor';
	}

	return 'chore';
}

/**
 * Determine impact level
 */
function determineImpactLevel(
	diff: DiffResult,
	languageInfo?: LanguageInfo | null,
	fileContext?: {importance: 'low' | 'medium' | 'high'},
): SmartSummary['impactLevel'] {
	const totalChanges = diff.stats.additions + diff.stats.deletions;

	// High risk files are automatically higher impact
	if (languageInfo?.isHighRisk || fileContext?.importance === 'high') {
		return totalChanges > 50 ? 'major' : 'moderate';
	}

	// Size-based assessment
	if (totalChanges > 100) return 'major';
	if (totalChanges > 20) return 'moderate';
	return 'minor';
}

/**
 * Generate concise title
 */
function generateTitle(
	changeType: SmartSummary['changeType'],
	fileContext: {purpose: string},
	contentAnalysis: {addedFunctions: string[]; configChanges: string[]},
): string {
	const typeMap = {
		feature: 'Add',
		fix: 'Fix',
		refactor: 'Refactor',
		config: 'Update',
		docs: 'Document',
		test: 'Test',
		style: 'Format',
		chore: 'Update',
	};

	const action = typeMap[changeType];

	if (contentAnalysis.addedFunctions.length > 0) {
		const funcName = contentAnalysis.addedFunctions[0];
		return `${action} ${funcName}() ${
			changeType === 'feature' ? 'function' : 'implementation'
		}`;
	}

	if (contentAnalysis.configChanges.length > 0) {
		return `${action} ${fileContext.purpose}`;
	}

	return `${action} ${fileContext.purpose}`;
}

/**
 * Generate detailed description
 */
function generateDescription(
	diff: DiffResult,
	_changeType: SmartSummary['changeType'],
	contentAnalysis: {
		addedFunctions: string[];
		removedFunctions: string[];
		addedImports: string[];
	},
): string {
	const parts: string[] = [];

	if (contentAnalysis.addedFunctions.length > 0) {
		parts.push(
			`Added ${
				contentAnalysis.addedFunctions.length
			} function(s): ${contentAnalysis.addedFunctions.slice(0, 3).join(', ')}`,
		);
	}

	if (contentAnalysis.removedFunctions.length > 0) {
		parts.push(
			`Removed ${contentAnalysis.removedFunctions.length} function(s)`,
		);
	}

	if (contentAnalysis.addedImports.length > 0) {
		parts.push(
			`New dependencies: ${contentAnalysis.addedImports
				.slice(0, 3)
				.join(', ')}`,
		);
	}

	parts.push(
		`${diff.stats.additions} additions, ${diff.stats.deletions} deletions`,
	);

	return parts.join(' • ');
}

/**
 * Identify affected areas
 */
function identifyAffectedAreas(
	_diff: DiffResult,
	languageInfo?: LanguageInfo | null,
	fileContext?: {category: string; purpose: string},
): string[] {
	const areas: string[] = [];

	if (fileContext) {
		areas.push(fileContext.purpose);
	}

	if (languageInfo?.category === 'config') {
		areas.push('Project configuration');
	}

	if (languageInfo?.category === 'code') {
		areas.push('Application logic');
	}

	return areas.length > 0 ? areas : ['File system'];
}

/**
 * Extract technical details
 */
function extractTechnicalDetails(
	diff: DiffResult,
	languageInfo?: LanguageInfo | null,
): string[] {
	const details: string[] = [];

	details.push(`Language: ${languageInfo?.displayName || 'Unknown'}`);
	details.push(`Lines changed: ${diff.stats.additions + diff.stats.deletions}`);
	details.push(`Risk level: ${diff.riskLevel.toUpperCase()}`);

	return details;
}

/**
 * Generate user-friendly description
 */
function generateUserFriendlyDescription(
	changeType: SmartSummary['changeType'],
	fileContext: {purpose: string},
	_contentAnalysis: {addedFunctions: string[]},
	diff: DiffResult,
): string {
	const actionMap = {
		feature: 'adding new functionality to',
		fix: 'fixing issues in',
		refactor: 'improving the code structure of',
		config: 'updating configuration for',
		docs: 'updating documentation for',
		test: 'adding tests for',
		style: 'formatting code in',
		chore: 'making changes to',
	};

	const action = actionMap[changeType];
	const impact =
		diff.stats.additions > 20 ? 'significant changes' : 'minor updates';

	return `This operation involves ${action} ${fileContext.purpose}, making ${impact} to the file.`;
}
