import React from "react";
import { Box, Text } from "ink";
import { ConversationMessage } from "../../types/converstionTypes.js";


const HistoryComponent: React.FC<{ history: ConversationMessage[] }> = ({ history }) => {
    return (
        <Box flexDirection="column">
            <Text>History</Text>
            {history.map((message, index) => (
                <Box key={index}>
                    <Text>{message.content}</Text>
                </Box>
            ))}
        </Box>
    );
};

export default HistoryComponent;