import React, {createContext, useContext, useState, useCallback} from 'react';

export type InputState = {
	isTyping: boolean;
	hasActiveDialog: boolean;
	activeComponent: string | null;
	allowMessageBubbleInputs: boolean;
};

export type InputContextType = {
	inputState: InputState;
	setTypingState: (isTyping: boolean) => void;
	setDialogState: (hasDialog: boolean) => void;
	setActiveComponent: (component: string | null) => void;
	requestInputFocus: (component: string) => boolean;
	releaseInputFocus: (component: string) => void;
};

const InputContext = createContext<InputContextType | undefined>(undefined);

export const useInputContext = (): InputContextType => {
	const context = useContext(InputContext);
	if (context === undefined) {
		throw new Error('useInputContext must be used within an InputProvider');
	}
	return context;
};

type InputProviderProps = {
	children: React.ReactNode;
};

export const InputProvider: React.FC<InputProviderProps> = ({children}) => {
	const [inputState, setInputState] = useState<InputState>({
		isTyping: false,
		hasActiveDialog: false,
		activeComponent: null,
		allowMessageBubbleInputs: true,
	});

	const setTypingState = useCallback((isTyping: boolean) => {
		setInputState(prev => ({
			...prev,
			isTyping,
			allowMessageBubbleInputs: !isTyping && !prev.hasActiveDialog,
		}));
	}, []);

	const setDialogState = useCallback((hasDialog: boolean) => {
		setInputState(prev => ({
			...prev,
			hasActiveDialog: hasDialog,
			allowMessageBubbleInputs: !hasDialog && !prev.isTyping,
			// Clear active component when dialog state changes
			activeComponent: hasDialog ? prev.activeComponent : null,
		}));
	}, []);

	const setActiveComponent = useCallback((component: string | null) => {
		setInputState(prev => ({
			...prev,
			activeComponent: component,
		}));
	}, []);

	// Request input focus - returns true if granted
	const requestInputFocus = useCallback((component: string): boolean => {
		setInputState(prev => {
			// If no one has focus or it's the same component, grant it
			if (!prev.activeComponent || prev.activeComponent === component) {
				return {
					...prev,
					activeComponent: component,
				};
			}
			// Otherwise, deny the request
			return prev;
		});

		// Check if the request was granted
		return inputState.activeComponent === component || inputState.activeComponent === null;
	}, [inputState.activeComponent]);

	// Release input focus
	const releaseInputFocus = useCallback((component: string) => {
		setInputState(prev => {
			// Only release if this component currently has focus
			if (prev.activeComponent === component) {
				return {
					...prev,
					activeComponent: null,
				};
			}
			return prev;
		});
	}, []);

	const contextValue: InputContextType = {
		inputState,
		setTypingState,
		setDialogState,
		setActiveComponent,
		requestInputFocus,
		releaseInputFocus,
	};

	return (
		<InputContext.Provider value={contextValue}>
			{children}
		</InputContext.Provider>
	);
};