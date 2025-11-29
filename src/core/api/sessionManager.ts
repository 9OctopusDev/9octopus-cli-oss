import { SessionState, TokenUsage, ScrollPosition } from '../../interfaces/sessions.js';

export class SessionManager {
	private currentSession: SessionState;

	constructor() {
		this.currentSession = this.createNewSession();
	}

	createNewSession(): SessionState {
		const sessionId = `session-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Pre-approve safe tools that don't require user confirmation
		const toolApprovals = new Map<string, boolean>();
		toolApprovals.set('search', true);
		toolApprovals.set('read_file', true);

		return {
			sessionId,
			isConnected: false,
			tokenUsage: {
				input_tokens: 0,
				output_tokens: 0,
				tool_tokens: 0,
				total_tokens: 0,
				api_calls: 0,
				estimated_cost_usd: 0,
			},
			toolApprovals,
			createdAt: new Date(),
			messageCount: 0,
		};
	}

	getCurrentSession(): SessionState {
		return this.currentSession;
	}

	getSessionId(): string {
		return this.currentSession.sessionId;
	}

	resetSession(): SessionState {
		this.currentSession = this.createNewSession();
		return this.currentSession;
	}

	updateTokenUsage(tokenUsage: TokenUsage): void {
		// Add new token usage to existing cumulative totals
		this.currentSession.tokenUsage.input_tokens += tokenUsage.input_tokens;
		this.currentSession.tokenUsage.output_tokens += tokenUsage.output_tokens;
		this.currentSession.tokenUsage.tool_tokens += tokenUsage.tool_tokens;
		this.currentSession.tokenUsage.total_tokens += tokenUsage.total_tokens;
	}

	setConnectionStatus(connected: boolean): void {
		this.currentSession.isConnected = connected;
	}

	addToolApproval(toolType: string, approved: boolean): void {
		this.currentSession.toolApprovals.set(toolType, approved);
	}

	getToolApproval(toolType: string): boolean | undefined {
		return this.currentSession.toolApprovals.get(toolType);
	}

	hasToolApproval(toolType: string): boolean {
		return this.currentSession.toolApprovals.has(toolType);
	}

	isFirstMessage(): boolean {
		return this.currentSession.messageCount === 0;
	}

	incrementMessageCount(): void {
		this.currentSession.messageCount += 1;
	}

	getMessageCount(): number {
		return this.currentSession.messageCount;
	}

	saveScrollPosition(position: ScrollPosition): void {
		this.currentSession.scrollPosition = {
			...position,
			savedAt: new Date(),
		};
	}

	getScrollPosition(): ScrollPosition | undefined {
		return this.currentSession.scrollPosition;
	}

	clearScrollPosition(): void {
		this.currentSession.scrollPosition = undefined;
	}

	hasScrollPosition(): boolean {
		return this.currentSession.scrollPosition !== undefined;
	}

	isScrollPositionValid(currentHistoryLength: number): boolean {
		if (!this.currentSession.scrollPosition) {
			return false;
		}

		// Position is valid if history hasn't grown significantly
		// Allow some growth for new messages, but not major changes
		const savedLength = this.currentSession.scrollPosition.historyLength;
		const growthLimit = savedLength + 5; // Allow up to 5 new messages

		return currentHistoryLength <= growthLimit;
	}
}
