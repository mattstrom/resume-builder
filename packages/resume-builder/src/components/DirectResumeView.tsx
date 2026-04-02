import { type FC } from 'react';
import { observer } from 'mobx-react';
import { useStore } from '@/stores/store.provider.tsx';
import { useSettings } from './Settings.provider.tsx';
import { ResumeProvider } from './Resume.provider.tsx';
import { BasicLayout, ColumnLayout } from './layouts';
import { GridLayout } from './layouts/GridLayout.tsx';

import '../App.css';

export const DirectResumeView: FC = observer(() => {
	const { resumeStore } = useStore();
	const { template, showMarginPattern } = useSettings();

	const resume = resumeStore.selectedResume;

	if (!resume) {
		return (
			<div className="flex h-full w-full items-center justify-center text-gray-500">
				No resume selected
			</div>
		);
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
			<div className="preview-frame">
				<ResumeProvider data={resume}>
					<div className={className}>{templateComponent}</div>
				</ResumeProvider>
			</div>
		</div>
	);
});
