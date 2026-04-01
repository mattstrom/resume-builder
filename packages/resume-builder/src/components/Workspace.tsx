import { useParams } from '@tanstack/react-router';
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
	const { editorMode, viewMode } = useSettings();
	const { resumeId } = useParams({ strict: false });
	// Use the built-in hook for persistent layouts
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'workspace-layout',
		panelIds: ['editor', 'resume'],
		storage: localStorage,
	});

	if (!resumeId) {
		return null;
	}

	return (
		<div className="workspace">
			{editorMode === 'review' ? (
				<div className="workspace-review">
					<PreviewFrame resumeId={resumeId} />
				</div>
			) : (
				<Group
					orientation="horizontal"
					defaultLayout={defaultLayout}
					onLayoutChanged={onLayoutChanged}
				>
					<Panel
						id="editor"
						defaultSize="50%"
						minSize="30%"
						className="workspace-left"
					>
						<FormEditor />
					</Panel>

					<Separator className="resize-handle" />

					<Panel
						id="resume"
						defaultSize="50%"
						minSize="30%"
						className="workspace-right"
					>
						{viewMode === 'data' ? (
							<JsonEditor />
						) : (
							<PreviewFrame resumeId={resumeId} />
						)}
					</Panel>
				</Group>
			)}
		</div>
	);
};
