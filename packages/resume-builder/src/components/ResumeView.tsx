import { JsonEditor } from '@/components/JsonEditor';
import { PreviewFrame } from '@/components/PreviewFrame.tsx';
import { SimpleResumeView } from '@/components/SimpleResumeView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { ViewMode } from '@/stores/ui-state.store.ts';
import { useParams } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { type FC } from 'react';

interface ResumeViewProps {}

export const ResumeView: FC<ResumeViewProps> = observer(() => {
	const { applicationId } = useParams({ strict: false });

	const { uiStateStore } = useStore();
	const { viewMode } = uiStateStore;

	if (!applicationId) {
		return null;
	}

	if (viewMode === ViewMode.Simple) {
		return <SimpleResumeView />;
	}

	return (
		<div className="workspace-review">
			{viewMode === ViewMode.Data ? <JsonEditor /> : <PreviewFrame applicationId={applicationId} />}
		</div>
	);
});
