import { X } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';

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
	children: ReactNode;
}

export const ListEditor: FC<ListEditorProps> = observer(
	({ path, items, resumeId, variant, className, emptyPlaceholder }) => {
		const { listEditStore: store, uiStateStore } = useStore();
		const isEditing = store.isEditing(path);
		const isEditable = uiStateStore.isResumeEditable;
		const hasItems = items.length > 0;

		const handleClick = () => {
			if (isEditable && !isEditing) {
				store.beginEdit(resumeId, path, items);
			}
		};

		if (!isEditable) {
			if (!hasItems && emptyPlaceholder) {
				return <span className={className}>{emptyPlaceholder}</span>;
			}

			return variant === 'block' ? (
				<ul className={className}>
					{items.map((item, i) => (
						<li key={i}>{item}</li>
					))}
				</ul>
			) : (
				<span className={className}>{items.join(', ')}</span>
			);
		}

		if (!isEditing) {
			if (!hasItems && emptyPlaceholder) {
				return (
					<button
						type="button"
						className={className}
						onClick={handleClick}
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							font: 'inherit',
							color: 'inherit',
							cursor: 'pointer',
							textAlign: 'left',
						}}
					>
						{emptyPlaceholder}
					</button>
				);
			}

			return variant === 'block' ? (
				<ul className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
					{items.map((item, i) => (
						<li key={i}>{item}</li>
					))}
				</ul>
			) : (
				<span className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
					{items.join(', ')}
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
	children,
}) => {
	const WrapperTag = inline ? 'span' : 'div';

	return (
		<WrapperTag className={cn('group/reorder relative', inline ? 'inline-block' : 'block')}>
			<WrapperTag className="min-w-0">{children}</WrapperTag>
			<span className="absolute right-full top-0 z-10 mr-1 inline-flex items-center rounded-md border border-border bg-popover/95 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover/reorder:opacity-100">
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
	return (
		<span className={cn('relative inline-block', className)}>
			<span className="inline-flex flex-wrap items-center gap-2">
				{store.items.map((item, index) => (
					<span key={`${index}:${item}`} className="inline-flex items-center">
						{index > 0 && <span className="mr-2">, </span>}
						<DraggableListItem
							index={index}
							length={store.items.length}
							direction="horizontal"
							inline
							onMove={(fromIndex, toIndex) => store.moveItem(fromIndex, toIndex)}
							onRemove={() => store.removeItem(index)}
						>
							{store.editingIndex === index ? (
								<ItemInput
									value={store.editValue}
									onChange={(value) => store.updateEditValue(value)}
									onCommit={() => store.commitEditItem()}
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

			<span className="absolute left-0 top-full z-10 mt-1 inline-flex">
				{store.isAdding ? (
					<ItemInput
						value={store.addValue}
						onChange={(value) => store.updateAddValue(value)}
						onCommit={() => store.commitAdd()}
						onCancel={() => store.cancelAdd()}
						placeholder="New..."
						inline
					/>
				) : (
					<span className="inline-flex items-center rounded-md border border-border bg-popover/95 shadow-md">
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
					</span>
				)}
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

	const handleKeyDown = (event: KeyboardEvent) => {
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
