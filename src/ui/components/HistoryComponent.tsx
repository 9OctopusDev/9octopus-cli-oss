import React from "react";
import { Box, Text } from "ink";
import { ConversationMessage } from "../../types/converstionTypes.js";
import HomeComponent from "./HomeComponent.js";

const HistoryComponent: React.FC<{ history: ConversationMessage[] }> = ({ history }) => {
    return (
        <Box flexDirection="column">
            {history.map((message, index) => (
                <Box key={index} flexDirection="column">
                    {message.type === 'welcome' ? (
                        <HomeComponent />
                    ) : (
                        <Text>{message.content}</Text>
                    )}
                </Box>
            ))}
        </Box>
    );
};

export default HistoryComponent;