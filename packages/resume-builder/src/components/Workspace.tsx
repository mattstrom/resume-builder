import { TailorView } from '@/components/TailorView.tsx';
import { useParams } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { type FC } from 'react';

import { SideBySideView } from '@/components/SideBySideView.tsx';
import { AnalysisView } from '@/components/AnalysisView.tsx';
import { DirectResumeView } from '@/components/DirectResumeView.tsx';
import { ResumeView } from '@/components/ResumeView.tsx';
import { Mode } from '@/stores/ui-state.store.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { PreviewFrame } from './PreviewFrame.tsx';

import './Workspace.css';

export const Workspace: FC = observer(() => {
	const { uiStateStore } = useStore();
	const { mode } = uiStateStore;
	const { resumeId } = useParams({ strict: false });

	if (!resumeId) {
		return null;
	}

	return (
		<div className="workspace">
			{mode === Mode.Analysis && (
				<SideBySideView
					id="workspace-layout"
					panelIds={['editor', 'resume']}
					left={<AnalysisView />}
					right={<PreviewFrame resumeId={resumeId} />}
				/>
			)}
			{mode === Mode.Tailor && (
				<SideBySideView
					id="workspace-layout"
					panelIds={['jobDescription', 'resume']}
					left={<TailorView />}
					right={<PreviewFrame resumeId={resumeId} />}
				/>
			)}
			{mode === Mode.Edit && <DirectResumeView />}
			{mode === Mode.Review && <ResumeView />}
		</div>
	);
});
