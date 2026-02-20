import { useChat } from '@ai-sdk/react';
import { useParams } from '@tanstack/react-router';
import { type FC, useState } from 'react';
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
import { useSettings } from './Settings.provider';

export const ChatPanel: FC = () => {
	const { resumeId } = useParams({ strict: false });
	const { setChatOpen } = useSettings();
	const [input, setInput] = useState('');

	const { messages, sendMessage, status, stop } = useChat({
		transport: new DefaultChatTransport({
			api: 'http://localhost:3000/api/chat',
			body: { data: { resumeId } },
		}),
	});

	return (
		<div className="dark flex flex-col h-full w-[400px] border-l border-slate-700 bg-slate-900 text-slate-100">
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
				<h2 className="text-sm font-semibold text-white">
					AI Assistant
				</h2>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
					onClick={() => setChatOpen(false)}
				>
					<X className="h-4 w-4" />
				</Button>
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
										<MessageResponse>
											{message.parts
												.filter(
													(p) => p.type === 'text',
												)
												.map((p) => p.text)
												.join('')}
										</MessageResponse>
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
