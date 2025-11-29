import React, { useEffect, useState } from "react"
import { ToolExecutionRequest } from "../../interfaces/tools.js"
import { ConfirmDialogActionEnum } from "../../types/dialogs.js";
import { ShortcutAction, useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts.js";
import { Box, Text } from "ink";
import DiffPreview from "./DiffPreviewComponent.js";
import CustomSelectInput from "./CustomSelectInput.js";
import { generateToolDiff } from "../../core/utils/diffUtils.js";
import { SessionManager } from "../../core/api/sessionManager.js";
import { ToolManager } from "../../core/tools/ToolManager.js";
import { ConversationMessage } from "../../types/converstionTypes.js";

type ToolRequestComponentProps = {
    toolRequest: ToolExecutionRequest
    sessionManager: SessionManager;
    toolManager: ToolManager;
    setPendingTool: (tool: ToolExecutionRequest | null) => void;
    addHistoryItem: (
        message: ConversationMessage
    ) => void;
}

const ToolRequestComponent: React.FC<ToolRequestComponentProps> = ({ toolRequest, sessionManager, toolManager, setPendingTool, addHistoryItem }) => {


    const [items, setItems] = useState<
        { label: string; value: ConfirmDialogActionEnum }[]
    >([]);

    const [showPreview, setShowPreview] = useState(false);

    const message = Object.entries(toolRequest.args)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    const truncatedMessage = message.length > 200
        ? message.substring(0, 200) + '...'
        : message;

    const toolApproval = sessionManager.getToolApproval(toolRequest.name ?? '');

    if (toolApproval) {
        toolRequest.approved = toolApproval;
        toolManager.executeToolRequests(toolRequest);
        addHistoryItem({
            id: new Date().toLocaleDateString(),
            role: 'system',
            content: 'Executed: ' + truncatedMessage,
            timestamp: new Date(),
        });
        return;
    }

    // Generate diff preview for the tool
    const toolDiff = generateToolDiff(toolRequest.name || '', toolRequest.args);

    const handleConfirm = (action: ConfirmDialogActionEnum) => {

        if (action === ConfirmDialogActionEnum.YES) {
            toolRequest.approved = true;
            sessionManager.addToolApproval(toolRequest.name ?? '', false);
            toolManager.executeToolRequests(toolRequest);
            addHistoryItem({
                id: new Date().toLocaleDateString(),
                role: 'system',
                content: 'Executed: ' + truncatedMessage,
                timestamp: new Date(),
            });
        } else if (action === ConfirmDialogActionEnum.YES_DONT_ASK_AGAIN) {
            toolRequest.approved = true;
            sessionManager.addToolApproval(toolRequest.name ?? '', true);
            toolManager.executeToolRequests(toolRequest);
            addHistoryItem({
                id: new Date().toLocaleDateString(),
                role: 'system',
                content: 'Executed: ' + truncatedMessage,
                timestamp: new Date(),
            });
        } else if (action === ConfirmDialogActionEnum.DO_IT_DIFFERENTLY) {
            toolRequest.approved = false;
            sessionManager.addToolApproval(toolRequest.name ?? '', false);
            toolManager.executeToolRequests(toolRequest);
            addHistoryItem({
                id: new Date().toLocaleDateString(),
                role: 'system',
                content: 'Denial Execution: ' + truncatedMessage,
                timestamp: new Date(),
            });
        }

        setPendingTool(null);
    };


    // Handle keyboard shortcuts
    const handleShortcutAction = (action: ShortcutAction) => {
        switch (action) {
            case 'approve':
                handleConfirm(ConfirmDialogActionEnum.YES);
                break;
            case 'reject':
                handleConfirm(ConfirmDialogActionEnum.DO_IT_DIFFERENTLY);
                break;
            case 'always':
                handleConfirm(ConfirmDialogActionEnum.YES_DONT_ASK_AGAIN);
                break;
            case 'different':
                handleConfirm(ConfirmDialogActionEnum.DO_IT_DIFFERENTLY);
                break;
            case 'cancel':
                handleConfirm(ConfirmDialogActionEnum.DO_IT_DIFFERENTLY);
                break;
            case 'toggle_diff':
                setShowPreview(!showPreview);
                break;
        }
    };

    useKeyboardShortcuts({
        onAction: handleShortcutAction,
        enabled: true,
    });

    useEffect(() => {
        const items = [
            {
                label: '[Y] Yes',
                value: ConfirmDialogActionEnum.YES,
            },
            {
                label: "[A] Always",
                value: ConfirmDialogActionEnum.YES_DONT_ASK_AGAIN,
            },
            {
                label: '[N] No',
                value: ConfirmDialogActionEnum.DO_IT_DIFFERENTLY,
            },
        ];

        setItems(items);
    }, []);

    const onSelect = (item: { label: string; value: ConfirmDialogActionEnum }) => {
        handleConfirm(item.value);
    };

    return (

        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="cyan"
            padding={1}>

            <Text color="cyan" bold>
                Execute {toolRequest.name}?
            </Text>

            <Box paddingTop={1} marginBottom={1}>
                <Text color="white">
                    {truncatedMessage}
                </Text>
            </Box>

            <Box
                flexDirection="column">
                {/* Show truncated preview by default, or full preview when toggled */}
                {toolDiff && (
                    <Box flexDirection="column" marginBottom={1}>
                        <Box flexDirection="row" justifyContent="space-between">
                            <Text color="gray" dimColor>
                                Preview:
                            </Text>
                            <Text color="blue" dimColor>
                                [P] {showPreview ? 'Hide' : 'Show'} full preview
                            </Text>
                        </Box>
                        <DiffPreview
                            diff={toolDiff}
                            collapsible={true}
                            collapsed={!showPreview}
                            maxLines={showPreview ? undefined : 3}
                        />
                    </Box>
                )}
                <CustomSelectInput items={items} onSelect={onSelect} />
            </Box>
        </Box>

    );
}

export default ToolRequestComponent;