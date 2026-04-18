import { cn } from '@/lib/utils';
import { useStore } from '@/stores/store.provider';
import { Mode } from '@/stores/ui-state.store';
import { observer } from 'mobx-react';
import { type FC } from 'react';

const MODES: { value: Mode; label: string; num: string }[] = [
	{ value: Mode.Analysis, label: 'Analysis', num: '01' },
	{ value: Mode.Tailor, label: 'Tailor', num: '02' },
	{ value: Mode.Form, label: 'Form', num: '03' },
	{ value: Mode.Edit, label: 'Edit', num: '04' },
	{ value: Mode.Review, label: 'Review', num: '05' },
];

export const ResumePrimaryNav: FC = observer(() => {
	const { uiStateStore } = useStore();

	return (
		<nav className="flex items-stretch h-10 gap-0.5" aria-label="Workflow">
			{MODES.map((m) => {
				const active = uiStateStore.mode === m.value;
				return (
					<button
						key={m.value}
						role="tab"
						aria-selected={active}
						onClick={() => uiStateStore.setMode(m.value)}
						className={cn(
							'relative flex items-center gap-1.5 px-3 h-full text-[13px] tracking-tight transition-colors',
							active
								? 'text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						<span
							className={cn(
								'font-mono text-[10.5px] tracking-normal',
								active
									? 'text-[var(--appbar-accent,hsl(var(--primary)))]'
									: 'text-muted-foreground/50',
							)}
						>
							{m.num}
						</span>
						{m.label}
						{active && (
							<span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-t-sm bg-[var(--appbar-accent,hsl(var(--primary)))]" />
						)}
					</button>
				);
			})}
		</nav>
	);
});
