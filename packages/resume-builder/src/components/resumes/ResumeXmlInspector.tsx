import Editor from '@monaco-editor/react';
import { validateResumeXml } from '@resume-builder/entities';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { Button } from '../ui/button.tsx';

export const ResumeXmlInspector = observer(function ResumeXmlInspector() {
	const { editorStore } = useStore();
	const resume = editorStore.resumeData;
	const currentXml = resume?.xml ?? '';
	const [buffer, setBuffer] = useState(currentXml);
	const [baseXml, setBaseXml] = useState(currentXml);
	const dirty = buffer !== baseXml;

	useEffect(() => {
		if (!dirty) {
			setBuffer(currentXml);
			setBaseXml(currentXml);
		}
	}, [currentXml, dirty]);

	if (!resume) return null;

	const apply = () => {
		if (baseXml !== currentXml) {
			toast.error('The resume changed while you were editing. Refresh the XML buffer first.');
			return;
		}
		const validation = validateResumeXml(buffer);
		if (!validation.valid) {
			toast.error(validation.errors.join('; '));
			return;
		}
		getActiveResumeController(resume._id)?.replaceXml(buffer);
		setBaseXml(buffer);
		toast.success('XML applied');
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center justify-between border-b px-4 py-2">
				<div>
					<div className="text-sm font-medium">Canonical resume XML</div>
					<div className="text-xs text-muted-foreground">
						Changes are validated and applied as one collaborative transaction.
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={!dirty}
						onClick={() => {
							setBuffer(currentXml);
							setBaseXml(currentXml);
						}}
					>
						Refresh
					</Button>
					<Button disabled={!dirty} onClick={apply}>
						Apply XML
					</Button>
				</div>
			</div>
			<Editor
				className="min-h-0 flex-1"
				language="xml"
				value={buffer}
				onChange={(value) => setBuffer(value ?? '')}
				options={{
					automaticLayout: true,
					minimap: { enabled: false },
					wordWrap: 'on',
					formatOnPaste: true,
					tabSize: 2,
				}}
			/>
		</div>
	);
});
