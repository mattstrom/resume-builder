import { useParams } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { type FC, useEffect, useRef, useState } from 'react';
import {
	Group as PanelGroup,
	Panel,
	type PanelImperativeHandle,
	Separator as PanelResizeHandle,
} from 'react-resizable-panels';

import { DirectResumeView } from '@/components/DirectResumeView.tsx';
import { ConceptCoveragePanel } from '@/components/resumes/ConceptCoveragePanel.tsx';
import { ResumeXmlInspector } from '@/components/resumes/ResumeXmlInspector.tsx';
import { ResumeView } from '@/components/ResumeView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { Mode } from '@/stores/ui-state.store.ts';

import './Workspace.css';

export const Workspace: FC = observer(() => {
	const { uiStateStore } = useStore();
	const { mode } = uiStateStore;
	const { applicationId } = useParams({ strict: false });
	const conceptPanelRef = useRef<PanelImperativeHandle>(null);
	const [conceptPanelCollapsed, setConceptPanelCollapsed] = useState(
		() =>
			localStorage.getItem('concept-coverage-panel-collapsed') === 'true',
	);
	const savedConceptPanelSize =
		Number(localStorage.getItem('concept-coverage-panel-size')) || 22;

	useEffect(() => {
		if (conceptPanelCollapsed) {
			conceptPanelRef.current?.collapse();
		}
	}, [conceptPanelCollapsed]);

	const toggleConceptPanel = () => {
		const panel = conceptPanelRef.current;
		if (!panel) return;

		if (panel.isCollapsed()) {
			panel.expand();
			setConceptPanelCollapsed(false);
			localStorage.setItem('concept-coverage-panel-collapsed', 'false');
		} else {
			panel.collapse();
			setConceptPanelCollapsed(true);
			localStorage.setItem('concept-coverage-panel-collapsed', 'true');
		}
	};

	if (!applicationId) {
		return null;
	}

	return (
		<PanelGroup orientation="horizontal" className="workspace">
			<Panel
				panelRef={conceptPanelRef}
				id="concept-coverage"
				collapsible
				collapsedSize="3rem"
				defaultSize={`${savedConceptPanelSize}%`}
				minSize="16rem"
				maxSize="36%"
				onResize={({ asPercentage, inPixels }) => {
					const collapsed =
						conceptPanelRef.current?.isCollapsed() ?? inPixels <= 50;
					setConceptPanelCollapsed(collapsed);
					localStorage.setItem(
						'concept-coverage-panel-collapsed',
						String(collapsed),
					);
					if (!collapsed) {
						localStorage.setItem(
							'concept-coverage-panel-size',
							String(asPercentage),
						);
					}
				}}
			>
				<ConceptCoveragePanel
					applicationId={applicationId}
					collapsed={conceptPanelCollapsed}
					onToggleCollapse={toggleConceptPanel}
				/>
			</Panel>
			<PanelResizeHandle className="editor-resize-handle" />
			<Panel id="resume-editor" minSize="30%">
				<div className="h-full min-w-0">
					{mode === Mode.Edit && <DirectResumeView />}
					{mode === Mode.Review && <ResumeView />}
					{mode === Mode.Xml && <ResumeXmlInspector />}
				</div>
			</Panel>
		</PanelGroup>
	);
});
