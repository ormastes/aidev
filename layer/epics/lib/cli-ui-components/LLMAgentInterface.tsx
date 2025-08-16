import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

interface Message {
  id: string;
  role: 'user' | "assistant" | 'system';
  content: string;
  timestamp: Date;
  model?: string;
}

interface Agent {
  id: string;
  name: string;
  model: string;
  status: 'idle' | "thinking" | "responding" | 'error';
  capabilities: string[];
}

interface LLMAgentInterfaceProps {
  agent: Agent;
  messages: Message[];
  onSendMessage?: (message: string) => void;
  onClearChat?: () => void;
  onChangeModel?: (model: string) => void;
  availableModels?: string[];
}

export const LLMAgentInterface: React.FC<LLMAgentInterfaceProps> = ({
  agent,
  messages,
  onSendMessage,
  onClearChat,
  onChangeModel,
  availableModels = ['claude-3', 'gpt-4', 'llama-2', 'ollama']
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [inputMode, setInputMode] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape) {
      if (inputMode) {
        setInputMode(false);
        setInputMessage('');
      } else if (showModelSelect) {
        setShowModelSelect(false);
      } else {
        exit();
      }
    }

    if (input === 'i' && !inputMode && !showModelSelect) {
      setInputMode(true);
    }

    if (input === 'm' && !inputMode && !showModelSelect) {
      setShowModelSelect(true);
    }

    if (input === 'c' && !inputMode && !showModelSelect && onClearChat) {
      onClearChat();
    }

    if (key.return && inputMode && inputMessage.trim()) {
      if (onSendMessage) {
        onSendMessage(inputMessage);
      }
      setInputMessage('');
      setInputMode(false);
    }
  });

  const getRoleColor = (role: Message['role']) => {
    switch (role) {
      case 'user': return 'cyan';
      case "assistant": return 'green';
      case 'system': return 'yellow';
      default: return 'white';
    }
  };

  const getRoleIcon = (role: Message['role']) => {
    switch (role) {
      case 'user': return '👤';
      case "assistant": return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  };

  const getStatusDisplay = () => {
    switch (agent.status) {
      case "thinking":
        return (
          <Box>
            <Spinner type="dots" />
            <Text color="yellow"> Thinking...</Text>
          </Box>
        );
      case "responding":
        return (
          <Box>
            <Spinner type="dots" />
            <Text color="green"> Responding...</Text>
          </Box>
        );
      case 'error':
        return <Text color="red">⚠️ Error</Text>;
      case 'idle':
      default:
        return <Text color="gray">● Ready</Text>;
    }
  };

  const renderMessages = () => {
    const displayMessages = messages.slice(-10); // Show last 10 messages
    
    return (
      <Box flexDirection="column" gap={1}>
        {displayMessages.map((msg) => (
          <Box key={msg.id} flexDirection="column">
            <Box>
              <Text color={getRoleColor(msg.role)} bold>
                {getRoleIcon(msg.role)} {msg.role}
              </Text>
              <Text color="dim"> ({msg.timestamp.toLocaleTimeString()})</Text>
              {msg.model && <Text color="dim"> [{msg.model}]</Text>}
            </Box>
            <Box marginLeft={2} width={60}>
              <Text wrap="wrap">{msg.content}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  const modelItems = availableModels.map(model => ({
    label: model === agent.model ? `${model} (current)` : model,
    value: model
  }));

  if (showModelSelect) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Select Model:</Text>
        <SelectInput
          items={modelItems}
          onSelect={(item) => {
            if (onChangeModel) {
              onChangeModel(item.value);
            }
            setShowModelSelect(false);
          }}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? 'green' : 'gray'}>
              {isSelected ? '▶' : ' '}
            </Text>
          )}
          itemComponent={({ label, isSelected }) => (
            <Text color={isSelected ? 'green' : 'white'}>
              {label}
            </Text>
          )}
        />
        <Text color="dim" marginTop={1}>[ESC: Cancel]</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">🤖 {agent.name}</Text>
          <Text color="gray"> | Model: </Text>
          <Text color="yellow">{agent.model}</Text>
        </Box>
        <Box>{getStatusDisplay()}</Box>
      </Box>

      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor="gray" 
        padding={1}
        height={20}
        overflow="hidden"
      >
        {messages.length === 0 ? (
          <Text color="dim">No messages yet. Press 'i' to start typing...</Text>
        ) : (
          renderMessages()
        )}
      </Box>

      {inputMode ? (
        <Box marginTop={1}>
          <Text color="cyan">› </Text>
          <TextInput
            value={inputMessage}
            onChange={setInputMessage}
            placeholder="Type your message..."
          />
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {agent.capabilities.length > 0 && (
            <Box marginBottom={1}>
              <Text color="dim">Capabilities: </Text>
              <Text color="gray">{agent.capabilities.join(', ')}</Text>
            </Box>
          )}
          <Text color="dim">
            [i: Input] [m: Change Model] [c: Clear] [ESC: Exit]
          </Text>
        </Box>
      )}
    </Box>
  );
};