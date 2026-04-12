import {
	PromptInputButton,
	PromptInputHeader,
	PromptInputHoverCard,
	PromptInputHoverCardContent,
	PromptInputHoverCardTrigger,
} from '@/components/ai-elements/prompt-input.tsx';
import { ChatFilesMenu } from '@/components/chat/ChatFilesMenu.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { AtSignIcon, BriefcaseIcon, RulerIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { type FC } from 'react';

interface ChatPromptHeaderProps {}

export const ChatPromptHeader: FC<ChatPromptHeaderProps> = observer(() => {
	const { applicationStore } = useStore();
	const application = applicationStore.selectedApplication;

	return (
		<>
			<PromptInputHeader>
				{application && (
					<PromptInputButton size="sm" variant="outline">
						<BriefcaseIcon
							className="text-muted-foreground"
							size={12}
						/>
						<span className="max-w-[200px] truncate">
							{application.name || application.company}
						</span>
					</PromptInputButton>
				)}
				<PromptInputHoverCard>
					<PromptInputHoverCardTrigger>
						<PromptInputButton variant="outline">
							<AtSignIcon
								className="text-muted-foreground"
								size={12}
							/>
						</PromptInputButton>
						<PromptInputHoverCardContent className="w-[400px] p-0">
							<ChatFilesMenu />
						</PromptInputHoverCardContent>
					</PromptInputHoverCardTrigger>
				</PromptInputHoverCard>
				<PromptInputHoverCard>
					<PromptInputHoverCardTrigger>
						<PromptInputButton size="sm" variant="outline">
							<RulerIcon
								className="text-muted-foreground"
								size={12}
							/>
							<span>1</span>
						</PromptInputButton>
					</PromptInputHoverCardTrigger>
					<PromptInputHoverCardContent className="divide-y overflow-hidden p-0">
						<div className="space-y-2 p-3">
							<p className="font-medium text-muted-foreground text-sm">
								Attached Project Rules
							</p>
							<p className="ml-4 text-muted-foreground text-sm">
								Always Apply:
							</p>
							<p className="ml-8 text-sm">ultracite.mdc</p>
						</div>
						<p className="bg-sidebar px-4 py-3 text-muted-foreground text-sm">
							Click to manage
						</p>
					</PromptInputHoverCardContent>
				</PromptInputHoverCard>
			</PromptInputHeader>
		</>
	);
});
