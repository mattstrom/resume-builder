import { ReadonlyDataView } from '@/components/ReadonlyDataView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { observer } from 'mobx-react';
import { type FC } from 'react';
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

export const AnalysisView: FC = observer(() => {
	const { applicationStore } = useStore();
	const { selectedApplication } = applicationStore;
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'analysis-layout',
		panelIds: ['summary', 'assessment'],
		storage: localStorage,
	});

	if (!selectedApplication) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Select an application to view analysis.
			</div>
		);
	}

	return (
		<Group
			orientation="horizontal"
			defaultLayout={defaultLayout}
			onLayoutChanged={onLayoutChanged}
		>
			<Panel
				id="summary"
				defaultSize="50%"
				minSize="20%"
				className="workspace-panel"
			>
				<ReadonlyDataView
					title="Job Summary"
					description="Structured requirements extracted from the job posting."
					data={
						selectedApplication.jobSummary as Record<
							string,
							unknown
						>
					}
					emptyMessage="No job summary yet. Run analysis to populate."
				/>
			</Panel>

			<Separator className="resize-handle resize-handle-horizontal" />

			<Panel
				id="assessment"
				defaultSize="50%"
				minSize="20%"
				className="workspace-panel"
			>
				<ReadonlyDataView
					title="Job Assessment"
					description="Fit analysis between your profile and the job requirements."
					data={
						selectedApplication.analysis as Record<string, unknown>
					}
					emptyMessage="No assessment yet. Run analysis to populate."
				/>
			</Panel>
		</Group>
	);
});
