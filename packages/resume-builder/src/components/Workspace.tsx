import { TailorView } from '@/components/TailorView.tsx';
import { useParams } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { type FC } from 'react';

import { AnalysisView } from '@/components/AnalysisView.tsx';
import { DirectResumeView } from '@/components/DirectResumeView.tsx';
import { ResumeView } from '@/components/ResumeView.tsx';
import { TailorInsightsView } from '@/components/TailorInsightsView.tsx';
import { ThreeColumnView } from '@/components/ThreeColumnView.tsx';
import { Mode } from '@/stores/ui-state.store.ts';
import { useStore } from '@/stores/store.provider.tsx';

import './Workspace.css';

export const Workspace: FC = observer(() => {
	const { uiStateStore } = useStore();
	const { mode } = uiStateStore;
	const { applicationId } = useParams({ strict: false });

	if (!applicationId) {
		return null;
	}

	return (
		<div className="workspace">
			{mode === Mode.Analysis && <AnalysisView />}
			{mode === Mode.Tailor && (
				<ThreeColumnView
					id="workspace-layout"
					panelIds={['jobDescription', 'jobInsights', 'resume']}
					left={<TailorView />}
					center={<TailorInsightsView />}
					right={<DirectResumeView />}
				/>
			)}
			{mode === Mode.Edit && <DirectResumeView />}
			{mode === Mode.Review && <ResumeView />}
		</div>
	);
});
