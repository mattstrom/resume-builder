import { observer } from 'mobx-react';
import { ScanSearch } from 'lucide-react';
import { type FC } from 'react';
import { useStore } from '@/stores/store.provider.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

export const ResumeToolbar: FC = observer(() => {
	const { inspectStore } = useStore();

	return (
		<div className="flex items-center gap-2 px-3 py-1.5">
			<Button
				variant={'default'}
				size="sm"
				className={cn(
					'h-7 gap-1.5 text-xs',
					inspectStore.isInspectMode &&
						'bg-blue-500 hover:bg-blue-600 text-white',
				)}
				onClick={() => inspectStore.toggleInspectMode()}
				aria-pressed={inspectStore.isInspectMode}
			>
				<ScanSearch className="h-3.5 w-3.5" />
				Inspect
			</Button>
			{inspectStore.hasSelection && (
				<span className="text-xs text-slate-500">
					{inspectStore.selectedPaths.size} region
					{inspectStore.selectedPaths.size !== 1 ? 's' : ''} selected
				</span>
			)}
		</div>
	);
});
