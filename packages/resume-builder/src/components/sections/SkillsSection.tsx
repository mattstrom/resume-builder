import type { Skill, SkillGroup } from '@resume-builder/entities';
import { Trash2, X } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, Fragment } from 'react';

import { CollectionEditorItem } from '@/components/CollectionEditorItem.tsx';
import { InlineEditor } from '@/components/InlineEditor.tsx';
import { ListEditor } from '@/components/ListEditor.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { useResume, useResumeId } from '../Resume.provider.tsx';
import { Section } from './Section.tsx';

interface SkillsSectionProps {}

export const SkillsSection: FC<SkillsSectionProps> = observer(() => {
	const { skills, skillGroups } = useResume();
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	const { listEditStore } = useStore();

	// Prefer skillGroups if available
	if (skillGroups && skillGroups.length > 0) {
		return (
			<Section heading="Skills" className="skills" path="data.skillGroups" label="Skills">
				<dfn>
					{skillGroups.map((group: SkillGroup, index: number) => (
						<CollectionEditorItem
							key={group._id ?? index}
							index={index}
							length={skillGroups.length}
							label="skill group"
							path={`data.skillGroups.${index}`}
							controlsPosition="left"
							onMove={(fromIndex, toIndex) =>
								void controller?.moveArrayItem(
									'data.skillGroups',
									fromIndex,
									toIndex,
								)
							}
							onInsertAbove={() => {
								controller?.setField('data.skillGroups', [
									...skillGroups.slice(0, index),
									{ name: 'New group', items: ['New skill'] },
									...skillGroups.slice(index),
								]);
							}}
							onInsertBelow={() => {
								controller?.setField('data.skillGroups', [
									...skillGroups.slice(0, index + 1),
									{ name: 'New group', items: ['New skill'] },
									...skillGroups.slice(index + 1),
								]);
							}}
							actions={
								<>
									{listEditStore.isEditing(`data.skillGroups.${index}.items`) ? (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={() => listEditStore.discard()}
											aria-label="Cancel skill edits"
											title="Cancel skill edits"
										>
											<X />
										</Button>
									) : null}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() =>
											controller?.setField(
												'data.skillGroups',
												skillGroups.filter(
													(_, groupIndex) => groupIndex !== index,
												),
											)
										}
										aria-label="Remove skill group"
										title="Remove skill group"
									>
										<Trash2 />
									</Button>
								</>
							}
						>
							<div>
								<dt>
									<InlineEditor
										path={`data.skillGroups.${index}.name`}
										value={group.name}
										resumeId={resumeId}
									/>
									:
								</dt>
								<dd>
									<ListEditor
										path={`data.skillGroups.${index}.items`}
										items={group.items}
										resumeId={resumeId}
										variant="inline"
									/>
								</dd>
							</div>
						</CollectionEditorItem>
					))}
				</dfn>
			</Section>
		);
	}

	// Fall back to skills and group by category
	if (skills && skills.length > 0) {
		// Group skills by category
		const groupedSkills = skills.reduce(
			(acc: Record<string, Array<{ index: number; skill: Skill }>>, skill: Skill, index) => {
				const category = skill.category || 'Other';
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push({ index, skill });
				return acc;
			},
			{} as Record<string, Array<{ index: number; skill: Skill }>>,
		);

		return (
			<Section heading="Skills" className="skills" path="data.skills" label="Skills">
				<dfn>
					{Object.entries(groupedSkills).map(
						([category, categorySkills], index: number) => (
							<Fragment key={index}>
								<dt>{category}: </dt>
								<dd>
									<ListEditor
										path={`data.skills.${index}.items`}
										items={categorySkills.map(({ skill }) => skill.name)}
										resumeId={resumeId}
										variant="inline"
										onCommit={(itemNames) => {
											const originalCategory =
												categorySkills[0]?.skill.category ?? category;
											const updatedCategorySkills = itemNames.map(
												(name, skillIndex) => ({
													...(categorySkills[skillIndex]?.skill ?? {
														category: originalCategory,
													}),
													name,
													category: originalCategory,
												}),
											);
											const categorySkillIndexes = new Set(
												categorySkills.map(
													({ index: skillIndex }) => skillIndex,
												),
											);

											getActiveResumeController(resumeId)?.setField(
												'data.skills',
												[
													...skills.filter(
														(_, skillIndex) =>
															!categorySkillIndexes.has(skillIndex),
													),
													...updatedCategorySkills,
												],
											);
										}}
									/>
								</dd>
							</Fragment>
						),
					)}
				</dfn>
			</Section>
		);
	}

	return null;
});
