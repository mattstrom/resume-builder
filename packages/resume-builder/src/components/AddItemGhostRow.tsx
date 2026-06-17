import { Plus } from 'lucide-react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button.tsx';

interface AddItemGhostRowProps {
	/** Singular label of the item being added, e.g. "job", "project". */
	label: string;
	onAdd: () => void;
	disabled?: boolean;
}

export const AddItemGhostRow: FC<AddItemGhostRowProps> = ({ label, onAdd, disabled }) => (
	<Button
		type="button"
		variant="ghost"
		onClick={onAdd}
		disabled={disabled}
		className="flex h-auto w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 py-3 text-sm font-normal text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
	>
		<Plus className="h-4 w-4" />
		Add {label}
	</Button>
);
