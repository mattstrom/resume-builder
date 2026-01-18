import { type FC } from 'react';
import { FormEditor } from './FormEditor';
import { JsonEditor } from './JsonEditor';
import { PreviewFrame } from './PreviewFrame.tsx';
import { useSettings } from './Settings.provider.tsx';
import {
	Panel,
	Group,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

import './Workspace.css';

export const Workspace: FC = () => {
	const { editorMode } = useSettings();

	// Use the built-in hook for persistent layouts
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'workspace-layout',
		panelIds: ['editor', 'resume'],
		storage: localStorage,
	});

	return (
		<div className="workspace">
			<Group
				orientation="horizontal"
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
			>
				<Panel
					id="editor"
					defaultSize={50}
					minSize={30}
					className="workspace-left"
				>
					{editorMode === 'json' ? <JsonEditor /> : <FormEditor />}
				</Panel>

				<Separator className="resize-handle" />

				<Panel
					id="resume"
					defaultSize={50}
					minSize={30}
					className="workspace-right"
				>
					<PreviewFrame />
				</Panel>
			</Group>
		</div>
	);
};
