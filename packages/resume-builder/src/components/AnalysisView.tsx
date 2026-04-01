import { Button } from '@/components/ui/button.tsx';
import Editor from '@monaco-editor/react';
import { type FC } from 'react';

interface AnalysisViewProps {}

export const AnalysisView: FC<AnalysisViewProps> = () => {
	const json = JSON.stringify({ name: 'John Doe', age: 30 }, null, 2);

	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
		>
			<div style={{ flexGrow: 0, overflow: 'hidden' }}>
				<Button
					onClick={() => {}}
					variant="outline"
					size="sm"
					className="text-white border-white/50 hover:border-white hover:bg-white/10"
				>
					New Application
				</Button>
			</div>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<Editor
					height="100%"
					defaultLanguage="json"
					theme="vs-dark"
					value={json}
					options={{
						minimap: { enabled: false },
						formatOnPaste: true,
						formatOnType: false,
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 2,
					}}
				/>
			</div>
		</div>
	);
};
