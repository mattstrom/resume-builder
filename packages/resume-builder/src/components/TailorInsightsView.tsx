import { useStore } from '@/stores/store.provider.tsx';
import Editor from '@monaco-editor/react';
import { observer } from 'mobx-react';
import { type FC, useMemo } from 'react';
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

interface ReadonlyJsonEditorProps {
	value: unknown;
}

interface TailorSectionProps {
	title: string;
	value: unknown;
}

const ReadonlyJsonEditor: FC<ReadonlyJsonEditorProps> = ({ value }) => {
	const json = useMemo(() => JSON.stringify(value ?? {}, null, 2), [value]);

	return (
		<Editor
			height="100%"
			defaultLanguage="json"
			theme="vs-dark"
			value={json}
			options={{
				readOnly: true,
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				automaticLayout: true,
				tabSize: 2,
			}}
		/>
	);
};

const TailorSection: FC<TailorSectionProps> = ({ title, value }) => {
	return (
		<section className="tailor-section">
			<header className="tailor-section-header">{title}</header>
			<div className="tailor-section-body">
				<ReadonlyJsonEditor value={value} />
			</div>
		</section>
	);
};

export const TailorInsightsView: FC = observer(() => {
	const { applicationStore } = useStore();
	const { selectedApplication } = applicationStore;
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'tailor-insights-layout',
		panelIds: ['summary', 'analysis'],
		storage: localStorage,
	});

	return (
		<Group
			orientation="vertical"
			defaultLayout={defaultLayout}
			onLayoutChanged={onLayoutChanged}
		>
			<Panel
				id="summary"
				defaultSize="50%"
				minSize="20%"
				className="workspace-panel"
			>
				<TailorSection
					title="Job Summary"
					value={selectedApplication?.jobSummary}
				/>
			</Panel>

			<Separator className="resize-handle resize-handle-vertical" />

			<Panel
				id="analysis"
				defaultSize="50%"
				minSize="20%"
				className="workspace-panel"
			>
				<TailorSection
					title="Job Analysis"
					value={selectedApplication?.analysis}
				/>
			</Panel>
		</Group>
	);
});
