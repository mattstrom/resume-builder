import {
	type FC,
	type KeyboardEvent,
	Fragment,
	useEffect,
	useRef,
} from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';

interface ListEditorProps {
	/** Dot-notation path to the array field */
	path: string;
	/** Current array values */
	items: string[];
	/** Resume _id */
	resumeId: string;
	/** "block" renders as <ul>/<li>, "inline" renders comma-separated */
	variant: 'block' | 'inline';
	/** className for the outer wrapper */
	className?: string;
}

export const ListEditor: FC<ListEditorProps> = observer(
	({ path, items, resumeId, variant, className }) => {
		const { listEditStore: store } = useStore();
		const isEditing = store.isEditing(path);

		const handleClick = () => {
			if (!isEditing) {
				store.beginEdit(resumeId, path, items);
			}
		};

		if (!isEditing) {
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

// ── Block variant (bullet list) ──

interface EditModeProps {
	store: ReturnType<typeof useStore>['listEditStore'];
	className?: string;
}

const BlockEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	return (
		<div className={className}>
			<ul>
				{store.items.map((item, index) => (
					<li key={index} className="group relative">
						{store.editingIndex === index ? (
							<ItemInput
								value={store.editValue}
								onChange={(v) => store.updateEditValue(v)}
								onCommit={() => store.commitEditItem()}
								onCancel={() => store.cancelEditItem()}
							/>
						) : (
							<span className="flex items-start gap-1">
								<span
									className="flex-1 cursor-pointer"
									onClick={() => store.beginEditItem(index)}
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
							</span>
						)}
					</li>
				))}
			</ul>

			{store.isAdding ? (
				<ItemInput
					value={store.addValue}
					onChange={(v) => store.updateAddValue(v)}
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

// ── Inline variant (comma-separated) ──

const InlineEditMode: FC<EditModeProps> = observer(({ store, className }) => {
	return (
		<span className={className}>
			{store.items.map((item, index) => (
				<Fragment key={index}>
					{index > 0 && ', '}
					{store.editingIndex === index ? (
						<ItemInput
							value={store.editValue}
							onChange={(v) => store.updateEditValue(v)}
							onCommit={() => store.commitEditItem()}
							onCancel={() => store.cancelEditItem()}
							inline
						/>
					) : (
						<span className="group/item inline">
							<span
								className="cursor-pointer"
								onClick={() => store.beginEditItem(index)}
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
				</Fragment>
			))}

			{store.isAdding ? (
				<>
					{store.items.length > 0 && ', '}
					<ItemInput
						value={store.addValue}
						onChange={(v) => store.updateAddValue(v)}
						onCommit={() => store.commitAdd()}
						onCancel={() => store.cancelAdd()}
						placeholder="New..."
						inline
					/>
				</>
			) : (
				<span className="ml-1 inline-flex gap-1">
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
	);
});

// ── Shared input for editing/adding items ──

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

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			onCommit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
		}
	};

	return (
		<input
			ref={inputRef}
			type="text"
			className={
				inline
					? 'inline-block w-auto rounded border border-gray-300 bg-white px-1 text-sm shadow-sm'
					: 'w-full rounded border border-gray-300 bg-white p-1 text-sm shadow-sm'
			}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onKeyDown={handleKeyDown}
			placeholder={placeholder}
		/>
	);
};
