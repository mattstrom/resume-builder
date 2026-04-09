import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputController,
} from '@/components/ai-elements/prompt-input.tsx';
import { ChatModelSelector } from '@/components/chat/ChatModelSelector.tsx';
import { ChatPromptHeader } from '@/components/chat/ChatPromptHeader.tsx';
import { type UseChatHelpers } from '@ai-sdk/react';
import { type FC } from 'react';

interface ChatPromptProps {
	onSubmit: (message: PromptInputMessage) => void;
	helpers: UseChatHelpers<any>;
}

export const ChatPrompt: FC<ChatPromptProps> = ({ onSubmit, helpers }) => {
	const controller = usePromptInputController();
	const { value: input, setInput, clear } = controller.textInput;

	const { status, stop } = helpers;

	return (
		<PromptInput
			onSubmit={(message) => {
				onSubmit(message);
				clear();
			}}
		>
			<ChatPromptHeader />
			<PromptInputBody>
				<PromptInputTextarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Ask about your resume..."
				/>
			</PromptInputBody>
			<PromptInputFooter>
				<PromptInputTools>
					<PromptInputActionMenu>
						<PromptInputActionMenuTrigger />
						<PromptInputActionMenuContent>
							<PromptInputActionAddAttachments />
							{/*<PromptInputActionAddScreenshot />*/}
						</PromptInputActionMenuContent>
					</PromptInputActionMenu>
					<ChatModelSelector />
				</PromptInputTools>
				<PromptInputSubmit status={status} onStop={stop} />
			</PromptInputFooter>
		</PromptInput>
	);
};
