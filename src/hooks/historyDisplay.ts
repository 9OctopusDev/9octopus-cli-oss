import {useState, useCallback} from 'react';
import {ConversationMessage} from '../types/converstionTypes.js';

type useHistoryDisplayProps = {
	history: ConversationMessage[];
	addHistoryItem: (message: ConversationMessage) => void;
	clearHistory: () => void;
};

const useHistoryDisplay = (): useHistoryDisplayProps => {
	const [history, setHistory] = useState<ConversationMessage[]>([
		{
			id: 'welcome',
			role: 'system',
			content: '',
			timestamp: new Date(),
			type: 'welcome',
		},
	]);

	const addHistoryItem = useCallback((message: ConversationMessage) => {
		const newItem: ConversationMessage = {
			...message,
		};

		setHistory(prev => [...prev, newItem]);
	}, []);

	const clearHistory = useCallback(() => {
		setHistory([
			{
				id: 'welcome',
				role: 'system',
				content: '',
				timestamp: new Date(),
				type: 'welcome',
			},
		]);
	}, []);

	return {
		history,
		addHistoryItem,
		clearHistory,
	};
};

export default useHistoryDisplay;
