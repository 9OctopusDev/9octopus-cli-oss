import {useInput} from 'ink';

export type ShortcutAction =
	| 'approve'
	| 'reject'
	| 'always'
	| 'different'
	| 'help'
	| 'toggle_diff'
	| 'toggle_rollback'
	| 'toggle_syntax'
	| 'cancel';

type KeyboardShortcutsProps = {
	onAction: (action: ShortcutAction) => void;
	enabled: boolean;
};

export const useKeyboardShortcuts = ({
	onAction,
	enabled,
}: KeyboardShortcutsProps) => {
	useInput((input, key) => {
		if (!enabled) return;

		// Debug logging

		// Handle single key shortcuts
		switch (input.toLowerCase()) {
			case 'y':
				onAction('approve');
				break;
			case 'n':
				onAction('reject');
				break;
			case 'a':
				onAction('always');
				break;
			case 'd':
				onAction('different');
				break;
			case '?':
			case 'h':
				onAction('help');
				break;
			case ' ': // Space to toggle diff
			case 'p': // P to toggle diff preview
				onAction('toggle_diff');
				break;
			case 'r':
				onAction('toggle_rollback');
				break;
			case 's':
				onAction('toggle_syntax');
				break;
			default:
		}

		// Handle navigation keys for menu
		if (key.upArrow) {
			const nav = (globalThis as any).__customSelectNavigation;
			if (nav?.up) nav.up();
			return;
		}

		if (key.downArrow) {
			const nav = (globalThis as any).__customSelectNavigation;
			if (nav?.down) nav.down();
			return;
		}

		if (key.return) {
			const nav = (globalThis as any).__customSelectNavigation;
			if (nav?.select) nav.select();
			return;
		}

		// Handle key combinations and special keys
		if (key.ctrl && input === 'd') {
			onAction('cancel'); // Ctrl+D should cancel/exit
		}

		if (key.escape) {
			onAction('cancel'); // Escape should also cancel
		}
	});
};

export const getShortcutHelp = (): string => {
	return [
		'Y: Approve',
		'N: Reject',
		'A: Always allow',
		'Space: Toggle diff',
		'Ctrl+D/Esc: Cancel',
		'S: Syntax',
		'?: Help',
	].join(' • ');
};
