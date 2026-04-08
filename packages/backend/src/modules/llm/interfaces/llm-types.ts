export interface LlmTextBlock {
	type: 'text';
	text: string;
}

export interface LlmToolUseBlock {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
}

export interface LlmToolResultBlock {
	type: 'tool_result';
	toolUseId: string;
	content: string;
	isError?: boolean;
}

export type LlmContentBlock =
	| LlmTextBlock
	| LlmToolUseBlock
	| LlmToolResultBlock;

export interface LlmMessage {
	role: 'user' | 'assistant' | 'system';
	content: string | LlmContentBlock[];
}

export interface LlmToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export type LlmStreamEvent =
	| { type: 'text-start'; id: string }
	| { type: 'text-delta'; id: string; delta: string }
	| { type: 'text-end'; id: string }
	| {
			type: 'tool-use';
			id: string;
			name: string;
			input: Record<string, unknown>;
	  }
	| {
			type: 'message-complete';
			stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
			content: LlmContentBlock[];
	  };

export interface LlmRequestOptions {
	model: string;
	system: string;
	messages: LlmMessage[];
	tools?: LlmToolDefinition[];
	maxTokens?: number;
}
