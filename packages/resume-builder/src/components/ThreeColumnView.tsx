import { observer } from 'mobx-react';
import { type FC, type ReactNode } from 'react';
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from 'react-resizable-panels';

interface ThreeColumnViewProps {
	id: string;
	panelIds: [string, string, string];
	left: ReactNode;
	center: ReactNode;
	right: ReactNode;
}

export const ThreeColumnView: FC<ThreeColumnViewProps> = observer(
	({ id, panelIds, left, center, right }) => {
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
					id={panelIds[0]}
					defaultSize="34%"
					minSize="20%"
					className="workspace-panel"
				>
					{left}
				</Panel>

				<Separator className="resize-handle resize-handle-horizontal" />

				<Panel
					id={panelIds[1]}
					defaultSize="28%"
					minSize="18%"
					className="workspace-panel"
				>
					{center}
				</Panel>

				<Separator className="resize-handle resize-handle-horizontal" />

				<Panel
					id={panelIds[2]}
					defaultSize="38%"
					minSize="24%"
					className="workspace-right"
				>
					{right}
				</Panel>
			</Group>
		);
	},
);
