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
				className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
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
						className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
						title="Chat History"
					>
						<MessageSquare className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-72 p-0 bg-slate-800 border-slate-700"
					align="start"
				>
					<div className="px-3 py-2 border-b border-slate-700">
						<p className="text-xs font-medium text-slate-300">
							Past Conversations
						</p>
					</div>
					<ScrollArea className="max-h-64">
						{conversations.length === 0 ? (
							<p className="px-3 py-4 text-xs text-slate-500 text-center">
								No conversations yet
							</p>
						) : (
							conversations.map((conv) => (
								<button
									key={conv._id}
									className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
										conv._id === activeConversationId
											? 'bg-slate-700/50 text-white'
											: 'text-slate-300'
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
										<p className="text-[10px] text-slate-500">
											{new Date(
												conv.updatedAt,
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 text-slate-500 hover:text-red-400 hover:bg-transparent"
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
