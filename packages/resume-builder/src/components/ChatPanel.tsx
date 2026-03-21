import { useChat } from '@ai-sdk/react';
import { useParams } from '@tanstack/react-router';
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { DefaultChatTransport } from 'ai';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from './ai-elements/conversation';
import {
	Message,
	MessageContent,
	MessageResponse,
} from './ai-elements/message';
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputSubmit,
} from './ai-elements/prompt-input';
import {
	Tool,
	ToolHeader,
	ToolContent,
	ToolInput,
	ToolOutput,
} from './ai-elements/tool';
import { ConversationList } from './ConversationList';
import { useSettings } from './Settings.provider';

const API_BASE = 'http://localhost:3000';

function getStorageKey(resumeId: string | undefined) {
	return resumeId ? `chat:lastConversation:${resumeId}` : null;
}

export const ChatPanel: FC = () => {
	const { resumeId } = useParams({ strict: false });
	const { setChatOpen } = useSettings();
	const [input, setInput] = useState('');
	const conversationIdRef = useRef<string | null>(null);
	const [conversationInfo, setConversationInfo] = useState<{
		title: string;
		createdAt: string;
	} | null>(null);
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${API_BASE}/api/chat`,
				body: { data: { resumeId } },
				fetch: async (url, init) => {
					// Inject current conversationId into each request body
					if (init?.body && typeof init.body === 'string') {
						const parsed = JSON.parse(init.body);
						parsed.data = {
							...parsed.data,
							conversationId: conversationIdRef.current,
						};
						init = { ...init, body: JSON.stringify(parsed) };
					}
					const response = await fetch(url, init);
					const newConvId = response.headers.get('X-Conversation-Id');
					if (newConvId && newConvId !== conversationIdRef.current) {
						conversationIdRef.current = newConvId;
						const key = getStorageKey(resumeId);
						if (key) localStorage.setItem(key, newConvId);
						// Fetch conversation info for display
						fetch(`${API_BASE}/api/conversations/${newConvId}`)
							.then((r) => r.json())
							.then((conv) =>
								setConversationInfo({
									title: conv.title,
									createdAt: conv.createdAt,
								}),
							)
							.catch(() => {});
					}
					return response;
				},
			}),
		[resumeId],
	);

	const { messages, sendMessage, status, stop, setMessages } = useChat({
		transport,
	});

	const loadConversation = useCallback(
		async (convId: string) => {
			try {
				const res = await fetch(
					`${API_BASE}/api/conversations/${convId}`,
				);
				if (!res.ok) return false;
				const data = await res.json();
				conversationIdRef.current = convId;
				setConversationInfo({
					title: data.title,
					createdAt: data.createdAt,
				});
				setMessages(
					data.messages.map(
						(m: { role: string; content: string }, i: number) => ({
							id: `loaded-${i}`,
							role: m.role as 'user' | 'assistant',
							content: m.content,
							parts: [{ type: 'text' as const, text: m.content }],
						}),
					),
				);
				const key = getStorageKey(resumeId);
				if (key) localStorage.setItem(key, convId);
				return true;
			} catch {
				return false;
			}
		},
		[resumeId, setMessages],
	);

	// Restore last conversation on mount
	useEffect(() => {
		const key = getStorageKey(resumeId);
		const savedId = key ? localStorage.getItem(key) : null;
		if (savedId) {
			loadConversation(savedId).then((ok) => {
				if (!ok && key) localStorage.removeItem(key);
			});
		}
	}, [resumeId, loadConversation]);

	const handleNewChat = useCallback(() => {
		conversationIdRef.current = null;
		setConversationInfo(null);
		setMessages([]);
		const key = getStorageKey(resumeId);
		if (key) localStorage.removeItem(key);
	}, [resumeId, setMessages]);

	const handleSelectConversation = useCallback(
		(conv: { _id: string }) => loadConversation(conv._id),
		[loadConversation],
	);

	return (
		<div className="dark flex flex-col h-full w-full border-l border-slate-700 bg-slate-900 text-slate-100">
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
				<div className="min-w-0 flex-1">
					<h2 className="text-sm font-semibold text-white truncate">
						{conversationInfo
							? conversationInfo.title
							: 'AI Assistant'}
					</h2>
					{conversationInfo && (
						<p className="text-[10px] text-slate-400">
							{new Date(
								conversationInfo.createdAt,
							).toLocaleString()}
						</p>
					)}
				</div>
				<div className="flex items-center gap-1">
					<ConversationList
						resumeId={resumeId}
						activeConversationId={conversationIdRef.current}
						onSelect={handleSelectConversation}
						onNewChat={handleNewChat}
					/>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
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
							title="Resume AI Assistant"
							description="Ask me anything about improving your resume."
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

			<div className="border-t border-slate-700 p-4">
				<PromptInput
					onSubmit={(message) => {
						sendMessage({ text: message.text });
						setInput('');
					}}
				>
					<PromptInputTextarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask about your resume..."
					/>
					<PromptInputSubmit status={status} onStop={stop} />
				</PromptInput>
			</div>
		</div>
	);
};
