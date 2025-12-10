import React, {useState} from 'react';
import {Box, Text} from 'ink';
import {DiffResult, DiffLine} from '../../core/utils/diffUtils.js';

type DiffPreviewProps = {
	diff: DiffResult;
	maxLines?: number;
	collapsible?: boolean;
	initiallyCollapsed?: boolean;
	collapsed?: boolean; // Controlled state from parent
};

const DiffPreview: React.FC<DiffPreviewProps> = ({
	diff,
	maxLines = 20,
	collapsible = true,
	initiallyCollapsed = false,
	collapsed,
}) => {
	const [internalCollapsed, setInternalCollapsed] =
		useState(initiallyCollapsed);

	// Use controlled state if provided, otherwise use internal state
	const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
	if (!diff.hasChanges) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color="gray">📄 {diff.summary}</Text>
			</Box>
		);
	}

	// Limit the number of lines shown to prevent overwhelming the UI
	const maxCharsPerLine = isCollapsed ? 80 : 120; // Shorter lines when collapsed

	const displayLines = diff.lines.slice(0, maxLines).map(line => ({
		...line,
		content:
			line.content.length > maxCharsPerLine
				? line.content.substring(0, maxCharsPerLine) + '...'
				: line.content,
	}));

	const hasMoreLines = diff.lines.length > maxLines;

	const getLineColor = (type: DiffLine['type']): string => {
		switch (type) {
			case 'added':
				return 'green';
			case 'removed':
				return 'red';
			case 'info':
				return 'cyan';
			case 'unchanged':
				return 'gray';
			default:
				return 'white';
		}
	};

	const getLinePrefix = (type: DiffLine['type']): string => {
		switch (type) {
			case 'added':
				return '+ ';
			case 'removed':
				return '- ';
			case 'unchanged':
				return '  ';
			case 'info':
				return '';
			default:
				return '';
		}
	};

	const formatLineNumber = (lineNumber?: number): string => {
		return lineNumber !== undefined
			? `${lineNumber.toString().padStart(3, ' ')}`
			: '   ';
	};

	// Toggle function (for future use with click handlers)
	const toggleCollapsed = () => {
		if (collapsible && collapsed === undefined) {
			// Only use internal state if not controlled by parent
			setInternalCollapsed(!internalCollapsed);
		}
	};
	// Suppress unused variable warning - keeping for future enhancement
	void toggleCollapsed;

	const shouldShowContent = !isCollapsed || !collapsible;
	const canCollapse = collapsible && diff.lines.length > 5;

	return (
		<Box flexDirection="column" marginTop={1}>
			<Box flexDirection="row" alignItems="center">
				<Text color="cyan" bold>
					Preview: {diff.summary}
				</Text>
				{canCollapse && (
					<Text color="gray" dimColor>
						{isCollapsed ? '[+]' : '[-]'}{' '}
						{isCollapsed ? '(Space to expand)' : '(Space to collapse)'}
					</Text>
				)}
			</Box>

			{shouldShowContent && (
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="white"
					paddingX={1}
					marginTop={1}
				>
					{displayLines.map((line, index) => (
						<Box key={index} flexDirection="row">
							{line.type !== 'info' && (
								<Text color="gray" dimColor>
									{formatLineNumber(line.lineNumber)}
								</Text>
							)}
							<Text color={getLineColor(line.type)}>
								{getLinePrefix(line.type)}
								{line.content}
							</Text>
						</Box>
					))}

					{hasMoreLines && (
						<Text color="gray" italic>
							... {diff.lines.length - maxLines} more lines
						</Text>
					)}
				</Box>
			)}

			{isCollapsed && canCollapse && (
				<Box marginTop={1}>
					<Text color="gray" italic>
						{diff.lines.length} lines hidden • Press Space to expand
					</Text>
				</Box>
			)}
		</Box>
	);
};

export default DiffPreview;
