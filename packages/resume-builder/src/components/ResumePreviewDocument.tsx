import type { Resume } from '@resume-builder/entities';

import { BasicLayout, ColumnLayout } from './layouts';
import { GridLayout } from './layouts/GridLayout.tsx';
import { ResumeProvider } from './Resume.provider.tsx';

export function ResumePreviewDocument({
	resume,
	template,
	showMarginPattern,
}: {
	resume: Resume;
	template: 'basic' | 'column' | 'grid';
	showMarginPattern: boolean;
}) {
	const templateComponent = (() => {
		switch (template) {
			case 'column':
				return <ColumnLayout />;
			case 'grid':
				return <GridLayout />;
			default:
				return <BasicLayout />;
		}
	})();

	return (
		<div className="preview-frame">
			<ResumeProvider data={resume}>
				<div className={showMarginPattern ? 'show-margin-pattern' : ''}>
					{templateComponent}
				</div>
			</ResumeProvider>
		</div>
	);
}
