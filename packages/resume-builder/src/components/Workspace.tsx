import { type FC } from 'react';
import { useSettings } from './Settings.provider.tsx';
import { BasicLayout, ColumnLayout } from './layouts';
import { Controls } from './Controls.tsx';
import { GridLayout } from './layouts/GridLayout.tsx';

import './Workspace.css';

export const Workspace: FC = () => {
	const { template } = useSettings();

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
		<div className="workspace">
			<div className="workspace-left">
				<Controls />
			</div>
			<div className="workspace-right">{templateComponent}</div>
		</div>
	);
};
