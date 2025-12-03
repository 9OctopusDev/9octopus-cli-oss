import test from 'ava';
import {SessionManager} from '../core/api/sessionManager.js';

test('SessionManager initializes correctly', t => {
	const manager = new SessionManager();
	const session = manager.getCurrentSession();

	t.truthy(session.sessionId);
	t.false(session.isConnected);
	t.is(session.messageCount, 0);
	t.true(manager.hasToolApproval('search'));
});

test('SessionManager updates token usage', t => {
	const manager = new SessionManager();

	manager.updateTokenUsage({
		input_tokens: 10,
		output_tokens: 20,
		tool_tokens: 5,
		total_tokens: 35,
		api_calls: 1,
		estimated_cost_usd: 0.01,
	});

	const session = manager.getCurrentSession();
	t.is(session.tokenUsage.total_tokens, 35);

	manager.updateTokenUsage({
		input_tokens: 5,
		output_tokens: 5,
		tool_tokens: 0,
		total_tokens: 10,
		api_calls: 1,
		estimated_cost_usd: 0.005,
	});

	t.is(session.tokenUsage.total_tokens, 45);
});

test('SessionManager handles message count', t => {
	const manager = new SessionManager();
	t.true(manager.isFirstMessage());

	manager.incrementMessageCount();
	t.false(manager.isFirstMessage());
	t.is(manager.getMessageCount(), 1);
});
