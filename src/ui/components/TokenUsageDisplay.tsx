import React from 'react';
import { Box, Text } from 'ink';
import { EnhancedTokenUsage } from '../../interfaces/tokenUsages.js';

interface TokenUsageDisplayProps {
    tokenUsage?: EnhancedTokenUsage;
    sessionTotal?: {
        total_tokens: number;
    };
    compact?: boolean;
}

const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
    tokenUsage,
    sessionTotal,
    compact = false,
}) => {
    if (!tokenUsage && !sessionTotal) {
        return null;
    }

    const formatTokens = (tokens: number | undefined): string => {
        if (tokens === undefined || tokens === null || isNaN(tokens)) {
            return '0';
        }
        if (tokens >= 1_000_000) {
            return `${(tokens / 1_000_000).toFixed(1)}M`;
        } else if (tokens >= 1_000) {
            return `${(tokens / 1_000).toFixed(1)}K`;
        }
        return tokens.toString();
    };


    if (compact) {
        // Compact display for status bar
        if (tokenUsage) {
            const { input_tokens, output_tokens, total_tokens, tool_tokens } = tokenUsage;

            return (
                <Text color="gray">
                    Tokens: {formatTokens(input_tokens)} → {formatTokens(output_tokens)}
                    {tool_tokens > 0 && ` (+${formatTokens(tool_tokens)} tools)`} = {formatTokens(total_tokens)}
                </Text>
            );
        }

        if (sessionTotal) {
            return (
                <Text color="gray">
                    Usage: {formatTokens(sessionTotal.total_tokens)} tokens
                </Text>
            );
        }
    }

    // Full display with breakdown
    return (
        <Box flexDirection="column" marginTop={1}>
            {tokenUsage && (
                <Box flexDirection="row" gap={2}>
                    <Text color="cyan">Token Usage:</Text>
                    <Text>
                        {formatTokens(tokenUsage.input_tokens)} → {formatTokens(tokenUsage.output_tokens)} → {formatTokens(tokenUsage.total_tokens)} total
                    </Text>
                    {tokenUsage.tool_tokens > 0 && (
                        <Text color="yellow">
                            (+{formatTokens(tokenUsage.tool_tokens)} tools)
                        </Text>
                    )}
                </Box>
            )}

            {sessionTotal && (
                <Box flexDirection="row" gap={2}>
                    <Text color="magenta">Usage Total:</Text>
                    <Text>
                        {formatTokens(sessionTotal.total_tokens)} tokens
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default TokenUsageDisplay;