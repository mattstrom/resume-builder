import { parseResumeXmlElements, type ResumeXmlOp } from '@resume-builder/entities';
import { observer } from 'mobx-react';
import { useMemo } from 'react';

import { useResume, useResumeId } from '@/components/Resume.provider.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { getActiveResumeController } from '@/lib/active-resume-controller.ts';

import { BlockEditor } from './BlockEditor.tsx';
import {
	findEditorBlock,
	createResumeXmlInsertOp,
	getResumeXmlInsertOptions,
	getMovableXmlChild,
	getXmlChildInsertIndex,
	indexBlockBindings,
	resumeXmlToBlocks,
} from './resume-xml-blocks.ts';

export const ResumeBlockEditor = observer(function ResumeBlockEditor() {
	// The provider snapshot changes for local and remote Yjs transactions.
	useResume();
	const resumeId = useResumeId();
	const controller = getActiveResumeController(resumeId);
	const xml = controller?.getXml();
	const xmlTree = useMemo(() => (xml ? parseResumeXmlElements(xml) : undefined), [xml]);
	const blocks = useMemo(() => (xmlTree ? resumeXmlToBlocks(xmlTree) : []), [xmlTree]);
	const bindings = useMemo(() => indexBlockBindings(blocks), [blocks]);

	const updateBlock = (blockId: string, value: string) => {
		const binding = bindings.get(blockId);
		if (!binding || !controller) return;

		const ops: ResumeXmlOp[] = [];
		if (binding.kind === 'text') {
			ops.push({ op: 'setText', target: { xmlId: binding.xmlId }, value });
			if (findEditorBlock(blocks, blockId)?.type === 'bullet') {
				ops.push({
					op: 'removeAttribute',
					target: { xmlId: binding.xmlId },
					name: 'bullet-id',
				});
			}
		} else if (value) {
			ops.push({
				op: 'setAttribute',
				target: { xmlId: binding.xmlId },
				name: binding.name,
				value,
			});
		} else {
			ops.push({
				op: 'removeAttribute',
				target: { xmlId: binding.xmlId },
				name: binding.name,
			});
		}
		controller.applyXmlOps(ops);
	};

	const moveBlock = (parentId: string, fromIndex: number, toIndex: number) => {
		const child = getMovableXmlChild(blocks, parentId, fromIndex);
		if (!child || !controller) return;
		controller.applyXmlOps([
			{
				op: 'moveNode',
				target: { xmlId: child.id },
				parent: { xmlId: parentId },
				index: toIndex,
			},
		]);
	};

	const getInsertOptions = (parentBlockId: string | undefined, visualIndex: number) => {
		if (!xmlTree) return [];
		const parentXmlId = parentBlockId ?? xmlTree.xmlId;
		const childIndex = getXmlChildInsertIndex(blocks, parentBlockId, visualIndex);
		return getResumeXmlInsertOptions(xmlTree, parentXmlId, childIndex);
	};

	const insertBlock = (
		parentBlockId: string | undefined,
		visualIndex: number,
		option: { id: string },
	) => {
		if (!controller || !xmlTree) return;
		const parentXmlId = parentBlockId ?? xmlTree.xmlId;
		const childIndex = getXmlChildInsertIndex(blocks, parentBlockId, visualIndex);
		const op = createResumeXmlInsertOp(xmlTree, parentXmlId, childIndex, option.id);
		if (op) controller.applyXmlOps([op]);
	};

	return (
		<main className="h-full overflow-y-auto bg-background px-5 py-6 text-foreground md:px-8 md:py-8">
			<div className="flex w-full flex-col">
				<header className="mb-4 flex items-center justify-between gap-3 px-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							XML block editor
						</p>
						<p className="text-xs text-muted-foreground">
							Each block edits its corresponding CRDT element.
						</p>
					</div>
					<Badge variant="outline">Autosaved</Badge>
				</header>
				<BlockEditor
					blocks={blocks}
					onChange={updateBlock}
					onNestedMove={moveBlock}
					getInsertOptions={getInsertOptions}
					onInsert={insertBlock}
					ariaLabel="Resume XML block editor"
				/>
			</div>
		</main>
	);
});
