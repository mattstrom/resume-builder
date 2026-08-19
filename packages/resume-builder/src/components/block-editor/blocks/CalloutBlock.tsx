import { Lightbulb } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';

import { EditableBlockText } from '../EditableBlockText.tsx';
import type { BlockRendererProps } from '../types.ts';

export function CalloutBlock({ block, onCommit }: BlockRendererProps) {
	return (
		<Alert>
			<Lightbulb />
			<AlertDescription>
				<EditableBlockText
					block={block}
					onCommit={onCommit}
					className="text-sm leading-6"
					multiline
				/>
			</AlertDescription>
		</Alert>
	);
}
