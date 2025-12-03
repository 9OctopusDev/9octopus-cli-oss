import test from 'ava';
import {CommandAgregator} from '../core/commands/commands.js';
import {SlashCommand} from '../interfaces/slashCommands.js';

test('CommandAgregator adds and retrieves commands', t => {
	const aggregator = new CommandAgregator();
	const command: SlashCommand = {
		name: 'test',
		description: 'Test command',
		action: async () => {},
		subcommands: [],
	};

	aggregator.addCommand(command);

	t.is(aggregator.getCommand('test'), command);
	t.is(aggregator.getCommands().length, 1);
});

test('CommandAgregator searches commands', t => {
	const aggregator = new CommandAgregator();
	const command1: SlashCommand = {
		name: 'foo',
		description: 'Foo command',
		action: async () => {},
		subcommands: [],
	};
	const command2: SlashCommand = {
		name: 'bar',
		description: 'Bar command',
		action: async () => {},
		subcommands: [],
	};

	aggregator.addCommand(command1);
	aggregator.addCommand(command2);

	const results = aggregator.searchCommand('fo');
	t.is(results.length, 1);
	t.is(results[0]?.name, 'foo');
});
