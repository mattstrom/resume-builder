import type { ResumeSectionKey } from '@resume-builder/entities';
import { observer } from 'mobx-react';
import { createContext, type FC, type ReactNode, useContext } from 'react';

import { ReorderControls } from '@/components/ReorderControls.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { moveSection, orderSectionKeys, RESUME_SECTION_LABELS } from './section-order.ts';

interface SectionSlot {
	key: ResumeSectionKey;
	/** Every section sharing this layout region, in rendered order. */
	region: readonly ResumeSectionKey[];
}

const SectionSlotContext = createContext<SectionSlot | null>(null);

interface OrderedSectionsProps {
	/** The sections this layout region can show, keyed by resume section. */
	sections: Partial<Record<ResumeSectionKey, ReactNode>>;
}

/**
 * Render one layout region's sections in the order the resume XML lists them.
 * Each section learns its slot through context, which is how its heading gets
 * move controls without every section component having to know about ordering.
 */
export const OrderedSections: FC<OrderedSectionsProps> = ({ sections }) => {
	const { sectionOrder } = useResume();
	const region = orderSectionKeys(sectionOrder, Object.keys(sections) as ResumeSectionKey[]);

	return (
		<>
			{region.map((key) => (
				<SectionSlotContext.Provider key={key} value={{ key, region }}>
					{sections[key]}
				</SectionSlotContext.Provider>
			))}
		</>
	);
};

export interface SectionMoves {
	label: string;
	moveUp?: () => void;
	moveDown?: () => void;
}

/**
 * The moves available to the section being rendered, or null when it sits
 * outside an ordered region or has nowhere to go.
 */
export function useSectionMoves(): SectionMoves | null {
	const slot = useContext(SectionSlotContext);
	const { sectionOrder } = useResume();
	const resumeId = useResumeId();

	if (!slot || slot.region.length < 2) return null;

	const move = (direction: -1 | 1) => {
		const next = moveSection(sectionOrder, slot.key, direction, slot.region);
		if (!next) return undefined;
		return () => getActiveResumeController(resumeId)?.setField('data.sectionOrder', next);
	};

	return {
		label: `${RESUME_SECTION_LABELS[slot.key]} section`,
		moveUp: move(-1),
		moveDown: move(1),
	};
}

/**
 * Floating up/down controls for a section heading. The resume is paper
 * regardless of app theme, so the buttons are pinned to dark-on-white instead
 * of the themed ghost colours.
 */
export const SectionMoveControls: FC = observer(() => {
	const moves = useSectionMoves();
	const { uiStateStore } = useStore();

	if (!moves || !uiStateStore.isResumeEditable) return null;

	return (
		<div className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-1 py-0.5 text-zinc-900 opacity-0 shadow-md transition-opacity [color-scheme:light] focus-within:opacity-100 group-hover/section:opacity-100 print:hidden [&_button]:text-zinc-700 [&_button:hover]:bg-zinc-100 [&_button:hover]:text-zinc-900">
			<ReorderControls
				direction="vertical"
				canMoveBackward={Boolean(moves.moveUp)}
				canMoveForward={Boolean(moves.moveDown)}
				onMoveBackward={() => moves.moveUp?.()}
				onMoveForward={() => moves.moveDown?.()}
				label={moves.label}
			/>
		</div>
	);
});
