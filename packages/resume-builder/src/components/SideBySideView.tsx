import { observer } from 'mobx-react';
import { type FC, type ReactNode } from 'react';
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

interface SideBySideViewProps {
	id: string;
	panelIds: string[];
	left: ReactNode;
	right: ReactNode;
}

export const SideBySideView: FC<SideBySideViewProps> = observer(
	({ id, panelIds, left, right }) => {
		const { defaultLayout, onLayoutChanged } = useDefaultLayout({
			id,
			panelIds,
			storage: localStorage,
		});

		return (
			<Group
				orientation="horizontal"
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
			>
				<Panel
					id="editor"
					defaultSize="50%"
					minSize="30%"
					className="workspace-left"
				>
					{left}
				</Panel>

				<Separator className="resize-handle" />

				<Panel
					id="resume"
					defaultSize="50%"
					minSize="30%"
					className="workspace-right"
				>
					{right}
				</Panel>
			</Group>
		);
	},
);
