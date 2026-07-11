import { X } from 'lucide-react';
import { observer } from 'mobx-react';
import {
	type FC,
	Fragment,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
} from 'react';

import { HighlightRegion } from '@/components/HighlightRegion.tsx';
import { ReorderControls } from '@/components/ReorderControls.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';

interface ListEditorProps {
	path: string;
	items: string[];
	resumeId: string;
	variant: 'block' | 'inline';
	className?: string;
	emptyPlaceholder?: string;
	onCommit?: (items: string[]) => void | Promise<void>;
}

interface EditModeProps {
	store: ReturnType<typeof useStore>['listEditStore'];
	className?: string;
}

interface DraggableListItemProps {
	index: number;
	length: number;
	direction: 'vertical' | 'horizontal';
	onMove: (fromIndex: number, toIndex: number) => void;
	onRemove?: () => void;
	inline?: boolean;
	controlsPosition?: 'left' | 'bottom';
	children: ReactNode;
}

const HighlightableBlockItems: FC<{ path: string; items: string[] }> = ({ path, items }) => (
	<>
		{items.map((item, i) => (
			<HighlightRegion key={i} path={`${path}.${i}`} label={item}>
				<li>{item}</li>
			</HighlightRegion>
		))}
	</>
);

const HighlightableInlineItems: FC<{ path: string; items: string[] }> = ({ path, items }) => (
	<>
		{items.map((item, i) => (
			<Fragment key={i}>
				{i > 0 && ', '}
				<HighlightRegion path={`${path}.${i}`} label={item}>
					<span>{item}</span>
				</HighlightRegion>
			</Fragment>
		))}
	</>
);

export const ListEditor: FC<ListEditorProps> = observer(
	({ path, items, resumeId, variant, className, emptyPlaceholder, onCommit }) => {
		const { listEditStore: store, uiStateStore } = useStore();
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;
		const hasItems = items.length > 0;

		const handleClick = () => {
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, items, onCommit);
			}
		};

		if (!isEditable) {
			if (!hasItems && emptyPlaceholder) {
				return <span className={className}>{emptyPlaceholder}</span>;
			}

			return variant === 'block' ? (
				<ul className={className}>
					<HighlightableBlockItems path={path} items={items} />
				</ul>
			) : (
				<span className={className}>
					<HighlightableInlineItems path={path} items={items} />
				</span>
			);
		}

		if (!isEditing) {
			if (!hasItems) {
				return <span className={className}>{emptyPlaceholder}</span>;
			}

			return variant === 'block' ? (
				<ul className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
					<HighlightableBlockItems path={path} items={items} />
				</ul>
			) : (
				<span className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
					<HighlightableInlineItems path={path} items={items} />
				</span>
			);
		}

		return variant === 'block' ? (
			<BlockEditMode store={store} className={className} />
		) : (
			<InlineEditMode store={store} className={className} />
		);
	},
);

const DraggableListItem: FC<DraggableListItemProps> = ({
	index,
	length,
	direction,
	onMove,
	onRemove,
	inline = false,
	controlsPosition = 'left',
	children,
}) => {
	const WrapperTag = inline ? 'span' : 'div';

	return (
		<WrapperTag className={cn('group/reorder relative', inline ? 'inline-block' : 'block')}>
			<WrapperTag className="min-w-0">{children}</WrapperTag>
			<span
				className={cn(
					'absolute z-10 inline-flex items-center rounded-md border border-border bg-popover/95 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover/reorder:opacity-100',
					controlsPosition === 'bottom'
						? 'left-0 top-full mt-1'
						: 'right-full top-0 mr-1',
				)}
			>
				<ReorderControls
					direction={direction}
					canMoveBackward={index > 0}
					canMoveForward={index < length - 1}
					onMoveBackward={() => onMove(index, index - 1)}
					onMoveForward={() => onMove(index, index + 1)}
					label="item"
				/>
				{onRemove && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onRemove}
						aria-label="Remove item"
					>
						<X />
					</Button>
				)}
			</span>
		</WrapperTag>
	);
};

const BlockEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	return (
		<div className={cn('relative', className)}>
			<ul className="space-y-1">
				{store.items.map((item, index) => (
					<li key={`${index}:${item}`} className="list-none">
						<DraggableListItem
							index={index}
							length={store.items.length}
							direction="vertical"
							onMove={(fromIndex, toIndex) => store.moveItem(fromIndex, toIndex)}
							onRemove={() => store.removeItem(index)}
						>
							{store.editingIndex === index ? (
								<ItemInput
									value={store.editValue}
									onChange={(value) => store.updateEditValue(value)}
									onCommit={() => store.commitEditItem()}
									onCancel={() => store.cancelEditItem()}
								/>
							) : (
								<span
									className="cursor-pointer"
									onClick={() => store.beginEditItem(index)}
								>
									{item}
								</span>
							)}
						</DraggableListItem>
					</li>
				))}
			</ul>

			<div className="absolute left-0 top-full z-10 mt-1">
				{store.isAdding ? (
					<ItemInput
						value={store.addValue}
						onChange={(value) => store.updateAddValue(value)}
						onCommit={() => store.commitAdd()}
						onCancel={() => store.cancelAdd()}
						placeholder="New item..."
					/>
				) : (
					<div className="inline-flex items-center rounded-md border border-border bg-popover/95 shadow-md">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => store.beginAdd()}
						>
							Add item
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => store.commit()}
						>
							Save
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => store.discard()}
						>
							Cancel
						</Button>
					</div>
				)}
			</div>
		</div>
	);
});

const InlineEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	const editorRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent) => {
			if (!editorRef.current?.contains(event.target as Node)) {
				store.discard();
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && store.editingIndex === null) {
				store.discard();
			}
		};

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown, true);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown, true);
		};
	}, [store]);

	const persist = () => void store.persist();
	const moveItem = (fromIndex: number, toIndex: number) => {
		store.moveItem(fromIndex, toIndex);
		persist();
	};
	const removeItem = (index: number) => {
		store.removeItem(index);
		persist();
	};
	const commitEditItem = () => {
		store.commitEditItem();
		persist();
	};

	return (
		<span ref={editorRef} className={cn('relative inline-block', className)}>
			<span className="inline-flex flex-wrap items-center gap-2">
				{store.items.map((item, index) => (
					<span key={`${index}:${item}`} className="inline-flex items-center">
						{index > 0 && <span className="mr-2">, </span>}
						<DraggableListItem
							index={index}
							length={store.items.length}
							direction="horizontal"
							inline
							controlsPosition="bottom"
							onMove={moveItem}
							onRemove={() => removeItem(index)}
						>
							{store.editingIndex === index ? (
								<ItemInput
									value={store.editValue}
									onChange={(value) => store.updateEditValue(value)}
									onCommit={commitEditItem}
									onCancel={() => store.cancelEditItem()}
									inline
								/>
							) : (
								<span
									className="cursor-pointer"
									onClick={() => store.beginEditItem(index)}
								>
									{item}
								</span>
							)}
						</DraggableListItem>
					</span>
				))}
			</span>
		</span>
	);
});

interface ItemInputProps {
	value: string;
	onChange: (value: string) => void;
	onCommit: () => void;
	onCancel: () => void;
	placeholder?: string;
	inline?: boolean;
}

const ItemInput: FC<ItemInputProps> = ({
	value,
	onChange,
	onCommit,
	onCancel,
	placeholder,
	inline,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = (event: ReactKeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onCommit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onCancel();
		}
	};

	return (
		<input
			ref={inputRef}
			type="text"
			className={
				inline
					? 'inline-block w-auto rounded border border-border bg-white px-1 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400'
					: 'w-full rounded border border-border bg-white p-1 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400'
			}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={handleKeyDown}
			placeholder={placeholder}
		/>
	);
};
