import { useParams } from '@tanstack/react-router';
import { observer } from 'mobx-react';
import { type FC } from 'react';

import { DirectResumeView } from '@/components/DirectResumeView.tsx';
import { ResumeView } from '@/components/ResumeView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { Mode } from '@/stores/ui-state.store.ts';

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
			{mode === Mode.Edit && <DirectResumeView />}
			{mode === Mode.Review && <ResumeView />}
		</div>
	);
});
