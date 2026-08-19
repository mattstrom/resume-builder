import { observer } from 'mobx-react';
import { type FC } from 'react';

import { ResumeBlockEditor } from '@/components/block-editor/ResumeBlockEditor.tsx';
import { Stack } from '@/components/common/Stack.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { ViewMode } from '@/stores/ui-state.store.ts';

import { BasicLayout, ColumnLayout } from './layouts';
import { GridLayout } from './layouts/GridLayout.tsx';
import { ResumeProvider } from './Resume.provider.tsx';
import { ResumeToolbar } from './ResumeToolbar.tsx';
import { useSettings } from './Settings.provider.tsx';
import { SimpleResumeView } from './SimpleResumeView.tsx';

import '../App.css';

export const DirectResumeView: FC = observer(() => {
	const { template, showMarginPattern } = useSettings();
	const { editorStore, uiStateStore } = useStore();
	const { resumeData } = editorStore;

	if (!resumeData) {
		return (
			<div className="flex h-full w-full items-center justify-center text-gray-500">
				No linked resume selected
			</div>
		);
	}

	if (uiStateStore.viewMode === ViewMode.Simple) {
		return <SimpleResumeView />;
	}

	if (uiStateStore.viewMode === ViewMode.Blocks) {
		return <ResumeBlockEditor />;
	}

	const templateComponent = (() => {
		switch (template) {
			case 'column':
				return <ColumnLayout />;
			case 'grid':
				return <GridLayout />;
			case 'basic':
			default:
				return <BasicLayout />;
		}
	})();

	const className = showMarginPattern ? 'show-margin-pattern' : '';

	return (
		<div className="workspace-review">
			<Stack direction="column">
				<ResumeToolbar />
				<div className="preview-frame">
					<ResumeProvider data={resumeData}>
						<div className={className}>{templateComponent}</div>
					</ResumeProvider>
				</div>
			</Stack>
		</div>
	);
});
