import { type FC } from 'react';
import { Controls } from './Controls.tsx';
import { JsonEditor } from './JsonEditor';
import { PreviewFrame } from './PreviewFrame.tsx';
import {
	Panel,
	Group,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

import './Workspace.css';

export const Workspace: FC = () => {
	// Use the built-in hook for persistent layouts
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'workspace-layout',
		panelIds: ['controls', 'editor', 'resume'],
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
					id="controls"
					defaultSize={18}
					minSize={15}
					maxSize={250}
					className="workspace-left"
				>
					<Controls />
				</Panel>

				<Separator className="resize-handle" />

				<Panel
					id="editor"
					defaultSize={41}
					minSize={20}
					className="workspace-middle"
				>
					<JsonEditor />
				</Panel>

				<Separator className="resize-handle" />

				<Panel
					id="resume"
					defaultSize={41}
					minSize={30}
					className="workspace-right"
				>
					<PreviewFrame />
				</Panel>
			</Group>
		</div>
	);
};
