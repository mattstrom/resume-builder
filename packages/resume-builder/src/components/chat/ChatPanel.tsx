import { PromptInputProvider } from '@/components/ai-elements/prompt-input.tsx';
import { ChatPrompt } from '@/components/chat/ChatPrompt.tsx';
import { Button } from '@/components/ui/button';
import { useStore } from '@/stores/store.provider.tsx';
import { useChat } from '@ai-sdk/react';
import { useParams } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import { type FC, useEffect, useRef, useState } from 'react';

import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '../ai-elements/conversation';
import {
	Message,
	MessageContent,
	MessageResponse,
} from '../ai-elements/message';
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from '../ai-elements/tool';
import { ConversationList } from '../ConversationList';
import { useSettings } from '../Settings.provider';

export const ChatPanel: FC = observer(() => {
	const { conversationService } = useStore();

	const { applicationId } = useParams({ strict: false });
	const { setChatOpen } = useSettings();
	const conversationIdRef = useRef<string | null>(null);
	const [conversationInfo] = useState<{
		title: string;
		createdAt: string;
	} | null>(null);

	const helpers = useChat({
		transport: conversationService.transport,
	});
	const { messages, sendMessage, setMessages } = helpers;

	// Restore last conversation on mount
	useEffect(() => {
		conversationService.loadLastConversation();
	}, [applicationId]);

	useEffect(
		() =>
			autorun(() => {
				const { activeConversation, activeConversationId } =
					conversationService;
				if (!activeConversation) {
					if (!activeConversationId) {
						setMessages([]);
					}
					return;
				}

				setMessages(
					activeConversation.messages.map((m) => ({
						id: m.id,
						role: m.role,
						parts: m.parts,
					})) as any,
				);
			}),
		[],
	);

	const handleNewChat = () => {
		conversationService.addNewConversation();
	};

	const handleSelectConversation = (conv: { _id: string }) =>
		conversationService.loadConversation(conv._id);

	return (
		<div className="flex flex-col h-full w-full border-l border-border bg-card text-card-foreground">
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<div className="min-w-0 flex-1">
					<h2 className="text-sm font-semibold text-foreground truncate">
						{conversationInfo
							? conversationInfo.title
							: 'AI Assistant'}
					</h2>
					{conversationInfo && (
						<p className="text-[10px] text-muted-foreground">
							{new Date(
								conversationInfo.createdAt,
							).toLocaleString()}
						</p>
					)}
				</div>
				<div className="flex items-center gap-1">
					<ConversationList
						applicationId={applicationId}
						activeConversationId={conversationIdRef.current}
						onSelect={handleSelectConversation}
						onNewChat={handleNewChat}
					/>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						onClick={() => setChatOpen(false)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<Conversation className="flex-1">
				<ConversationContent>
					{messages.length === 0 ? (
						<ConversationEmptyState
							title="Application AI Assistant"
							description="Ask me anything about improving this application."
						/>
					) : (
						messages.map((message) => (
							<Message key={message.id} from={message.role}>
								<MessageContent>
									{message.role === 'user' ? (
										message.parts
											.filter((p) => p.type === 'text')
											.map((p) => p.text)
											.join('')
									) : (
										<>
											{message.parts.map((part, i) => {
												if (part.type === 'text') {
													return (
														<MessageResponse
															key={i}
														>
															{part.text}
														</MessageResponse>
													);
												}
												if (
													part.type.startsWith(
														'tool-',
													)
												) {
													const toolPart =
														part as any;
													const toolName =
														part.type.slice(5);
													return (
														<Tool key={i}>
															<ToolHeader
																type={
																	part.type as any
																}
																state={
																	toolPart.state
																}
																title={toolName}
															/>
															<ToolContent>
																<ToolInput
																	input={
																		toolPart.input
																	}
																/>
																{toolPart.output !==
																	undefined && (
																	<ToolOutput
																		output={
																			toolPart.output
																		}
																		errorText={
																			toolPart.errorText
																		}
																	/>
																)}
															</ToolContent>
														</Tool>
													);
												}
												return null;
											})}
										</>
									)}
								</MessageContent>
							</Message>
						))
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="border-t border-border p-4">
				<PromptInputProvider>
					<ChatPrompt
						helpers={helpers}
						onSubmit={(message) => {
							sendMessage({ text: message.text });
						}}
					/>
				</PromptInputProvider>
			</div>
		</div>
	);
});
