import { useState, useCallback } from 'react';
import { ConversationMessage } from '../types/converstionTypes.js';


type useHistoryDisplayProps = {
    history: ConversationMessage[];
    addHistoryItem: (
        message: ConversationMessage,
    ) => void;
    clearHistory: () => void;
};

const useHistoryDisplay = (): useHistoryDisplayProps => {
    const [history, setHistory] = useState<ConversationMessage[]>([]);

    const addHistoryItem = useCallback(
        (
            message: ConversationMessage,
        ) => {
            const newItem: ConversationMessage = {
                ...message,
            };

            setHistory(prev => [...prev, newItem]);
        },
        [],
    );


    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return {
        history,
        addHistoryItem,
        clearHistory,
    };
};

export default useHistoryDisplay;
