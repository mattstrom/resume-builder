import {
	type FC,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
} from 'react';
import { observer } from 'mobx-react';
import { ReorderControls } from '@/components/ReorderControls.tsx';
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
				<ul
					className={className}
					onClick={handleClick}
					style={{ cursor: 'pointer' }}
				>
					{items.map((item, i) => (
						<li key={i}>{item}</li>
					))}
				</ul>
			) : (
				<span
					className={className}
					onClick={handleClick}
					style={{ cursor: 'pointer' }}
				>
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
	inline = false,
	children,
}) => {
	const WrapperTag = inline ? 'span' : 'div';
	const ContentTag = inline ? 'span' : 'div';

	return (
		<WrapperTag>
			<ContentTag
				className={
					inline
						? 'inline-flex items-start gap-2'
						: 'flex items-start gap-2'
				}
			>
				<ReorderControls
					direction={direction}
					canMoveBackward={index > 0}
					canMoveForward={index < length - 1}
					onMoveBackward={() => onMove(index, index - 1)}
					onMoveForward={() => onMove(index, index + 1)}
					label="item"
				/>
				<ContentTag className="min-w-0 flex-1">{children}</ContentTag>
			</ContentTag>
		</WrapperTag>
	);
};

const BlockEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	return (
		<div className={className}>
			<ul className="space-y-1">
				{store.items.map((item, index) => (
					<li key={`${index}:${item}`} className="list-none">
						<DraggableListItem
							index={index}
							length={store.items.length}
							direction="vertical"
							onMove={(fromIndex, toIndex) =>
								store.moveItem(fromIndex, toIndex)
							}
						>
							{store.editingIndex === index ? (
								<ItemInput
									value={store.editValue}
									onChange={(value) =>
										store.updateEditValue(value)
									}
									onCommit={() => store.commitEditItem()}
									onCancel={() => store.cancelEditItem()}
								/>
							) : (
								<div className="group flex items-start gap-1">
									<span
										className="flex-1 cursor-pointer"
										onClick={() =>
											store.beginEditItem(index)
										}
									>
										{item}
									</span>
									<button
										type="button"
										className="ml-1 text-xs text-red-400 opacity-0 group-hover:opacity-100"
										onClick={() => store.removeItem(index)}
									>
										&times;
									</button>
								</div>
							)}
						</DraggableListItem>
					</li>
				))}
			</ul>

			{store.isAdding ? (
				<ItemInput
					value={store.addValue}
					onChange={(value) => store.updateAddValue(value)}
					onCommit={() => store.commitAdd()}
					onCancel={() => store.cancelAdd()}
					placeholder="New item..."
				/>
			) : (
				<div className="mt-1 flex gap-2">
					<button
						type="button"
						className="text-xs text-blue-500 hover:text-blue-700"
						onClick={() => store.beginAdd()}
					>
						+ Add item
					</button>
					<button
						type="button"
						className="text-xs text-green-600 hover:text-green-800"
						onClick={() => store.commit()}
					>
						Save
					</button>
					<button
						type="button"
						className="text-xs text-gray-400 hover:text-gray-600"
						onClick={() => store.discard()}
					>
						Cancel
					</button>
				</div>
			)}
		</div>
	);
});

const InlineEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	return (
		<span className={className}>
			<span className="inline-flex flex-wrap items-center gap-2">
				{store.items.map((item, index) => (
					<span
						key={`${index}:${item}`}
						className="inline-flex items-center"
					>
						{index > 0 && <span className="mr-2">, </span>}
						<DraggableListItem
							index={index}
							length={store.items.length}
							direction="horizontal"
							inline
							onMove={(fromIndex, toIndex) =>
								store.moveItem(fromIndex, toIndex)
							}
						>
							{store.editingIndex === index ? (
								<ItemInput
									value={store.editValue}
									onChange={(value) =>
										store.updateEditValue(value)
									}
									onCommit={() => store.commitEditItem()}
									onCancel={() => store.cancelEditItem()}
									inline
								/>
							) : (
								<span className="group/item inline">
									<span
										className="cursor-pointer"
										onClick={() =>
											store.beginEditItem(index)
										}
									>
										{item}
									</span>
									<button
										type="button"
										className="ml-0.5 text-xs text-red-400 opacity-0 group-hover/item:opacity-100"
										onClick={() => store.removeItem(index)}
									>
										&times;
									</button>
								</span>
							)}
						</DraggableListItem>
					</span>
				))}

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
					<span className="inline-flex gap-1">
						<button
							type="button"
							className="text-xs text-blue-500 hover:text-blue-700"
							onClick={() => store.beginAdd()}
						>
							+
						</button>
						<button
							type="button"
							className="text-xs text-green-600 hover:text-green-800"
							onClick={() => store.commit()}
						>
							Save
						</button>
						<button
							type="button"
							className="text-xs text-gray-400 hover:text-gray-600"
							onClick={() => store.discard()}
						>
							Cancel
						</button>
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
					? 'inline-block w-auto rounded border border-border bg-background px-1 text-sm shadow-sm'
					: 'w-full rounded border border-border bg-background p-1 text-sm shadow-sm'
			}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={handleKeyDown}
			placeholder={placeholder}
		/>
	);
};
