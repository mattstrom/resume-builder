import { useStore } from '@/stores/store.provider.tsx';
import { type FC, useCallback, useEffect, useState } from 'react';
import { authFetch } from '../utils/auth';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationSummary {
	_id: string;
	title: string;
	updatedAt: string;
}

interface ConversationListProps {
	applicationId: string | undefined;
	activeConversationId: string | null;
	onSelect: (conversation: ConversationSummary) => void;
	onNewChat: () => void;
}

export const ConversationList: FC<ConversationListProps> = ({
	applicationId,
	activeConversationId,
	onSelect,
	onNewChat,
}) => {
	const [conversations, setConversations] = useState<ConversationSummary[]>(
		[],
	);
	const [open, setOpen] = useState(false);

	const fetchConversations = async () => {
		if (!applicationId) return;
		try {
			const res = await authFetch(
				`http://localhost:3000/api/conversations?applicationId=${applicationId}`,
			);
			if (res.ok) {
				setConversations(await res.json());
			}
		} catch {
			// ignore fetch errors
		}
	};

	useEffect(() => {
		if (open) {
			void fetchConversations();
		}
	}, [open, applicationId]);

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		try {
			await authFetch(`http://localhost:3000/api/conversations/${id}`, {
				method: 'DELETE',
			});
			setConversations((prev) => prev.filter((c) => c._id !== id));
		} catch {
			// ignore
		}
	};

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
				onClick={onNewChat}
				title="New Chat"
			>
				<Plus className="h-4 w-4" />
			</Button>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
						title="Chat History"
					>
						<MessageSquare className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-72 p-0" align="start">
					<div className="px-3 py-2 border-b border-border">
						<p className="text-xs font-medium text-foreground">
							Past Conversations
						</p>
					</div>
					<ScrollArea className="max-h-64">
						{conversations.length === 0 ? (
							<p className="px-3 py-4 text-xs text-muted-foreground text-center">
								No conversations yet
							</p>
						) : (
							conversations.map((conv) => (
								<button
									key={conv._id}
									className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
										conv._id === activeConversationId
											? 'bg-accent text-accent-foreground'
											: 'text-muted-foreground'
									}`}
									onClick={() => {
										onSelect(conv);
										setOpen(false);
									}}
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs">
											{conv.title}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{new Date(
												conv.updatedAt,
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
										onClick={(e) =>
											handleDelete(e, conv._id)
										}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</button>
							))
						)}
					</ScrollArea>
				</PopoverContent>
			</Popover>
		</div>
	);
};
