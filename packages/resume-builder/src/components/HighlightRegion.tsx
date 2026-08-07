import { MessageSquarePlus, MessageSquareX } from 'lucide-react';
import { observer } from 'mobx-react';
import React, { type MouseEvent } from 'react';
import { type FC, type PropsWithChildren } from 'react';

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx';
import { useInspectRegion } from '@/hooks/useInspectRegion.ts';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/store.provider.tsx';

interface HighlightRegionProps extends PropsWithChildren {
	path: string;
	label?: string;
}

export const HighlightRegion: FC<HighlightRegionProps> = observer(
	({ path, label, children }) => {
		const { isInspectMode, isHovered, isSelected, handlers } =
			useInspectRegion(path, label);
		const { inspectStore } = useStore();
		const isInChat = inspectStore.selectedPaths.has(path);
		const isConceptEvidence =
			inspectStore.isConceptEvidenceHighlighted(path);

		const child = React.Children.only(children) as React.ReactElement<
			React.HTMLAttributes<HTMLElement>
		>;

		const showHighlight = isInspectMode || isSelected || isConceptEvidence;

		const childProps: React.HTMLAttributes<HTMLElement> = {
			// Keep the right-click on the innermost region only, so nested regions
			// (section → collection item → list item) don't all open at once.
			onContextMenu: (e: MouseEvent<HTMLElement>) => {
				e.stopPropagation();
				child.props.onContextMenu?.(e);
			},
		};

		if (showHighlight) {
			childProps.className = cn(
				child.props.className,
				isInspectMode && 'cursor-pointer',
				isConceptEvidence
					? 'ring-2 ring-info ring-inset bg-info/10 transition-colors'
					: isSelected
						? 'ring-2 ring-blue-500 ring-inset bg-blue-500/5'
						: isHovered
							? 'ring-2 ring-blue-400/70 ring-inset'
							: undefined,
			);

			// A selected region remains highlighted after it has been added to chat, but
			// it must not consume regular edit clicks once inspection is turned off.
			// This mirrors InlineEditor and lets nested regions, such as skill items,
			// continue to bubble their clicks to the list editor.
			if (isInspectMode) {
				childProps.onMouseEnter = (e: MouseEvent<HTMLElement>) => {
					handlers.onMouseEnter(e);
					child.props.onMouseEnter?.(e);
				};
				childProps.onMouseLeave = (e: MouseEvent<HTMLElement>) => {
					handlers.onMouseLeave(e);
					child.props.onMouseLeave?.(e);
				};
				childProps.onClick = (e: MouseEvent<HTMLElement>) => {
					handlers.onClick(e);
					child.props.onClick?.(e);
				};
			}
		}

		return (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					{React.cloneElement(child, childProps)}
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem
						onSelect={() =>
							inspectStore.toggleSelected(path, label)
						}
					>
						{isInChat ? (
							<>
								<MessageSquareX />
								Remove from chat
							</>
						) : (
							<>
								<MessageSquarePlus />
								Add to chat
							</>
						)}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	},
);
