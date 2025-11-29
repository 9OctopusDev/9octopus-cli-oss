import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export interface SelectItem {
    label: string;
    value: any;
}

interface CustomSelectInputProps {
    items: SelectItem[];
    onSelect: (item: SelectItem) => void;
    selectedIndex?: number;
    onNavigate?: (direction: 'up' | 'down') => void;
}

const CustomSelectInput: React.FC<CustomSelectInputProps> = ({
    items,
    onSelect,
    selectedIndex = 0,
    onNavigate,
}) => {
    const [currentIndex, setCurrentIndex] = useState(selectedIndex);

    useEffect(() => {
        setCurrentIndex(selectedIndex);
    }, [selectedIndex]);

    // Handle navigation from parent
    const handleNavigation = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            setCurrentIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
        } else {
            setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
        }
        onNavigate?.(direction);
    };

    const handleSelect = () => {
        if (items[currentIndex]) {
            onSelect(items[currentIndex]);
        }
    };

    // Expose methods for parent to call
    useEffect(() => {
        // Store navigation methods on a global reference so parent can access them
        // This is a workaround for the useInput conflict issue
        (globalThis as any).__customSelectNavigation = {
            up: () => handleNavigation('up'),
            down: () => handleNavigation('down'),
            select: handleSelect,
        };
    }, [currentIndex, items, onSelect, onNavigate]);

    return (
        <Box flexDirection="column">
            {items.map((item, index) => (
                <Box key={index} marginY={0}>
                    <Text color={index === currentIndex ? 'cyan' : 'white'}>
                        {index === currentIndex ? '❯ ' : '  '}
                        {item.label}
                    </Text>
                </Box>
            ))}
        </Box>
    );
};

export default CustomSelectInput;
