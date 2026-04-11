import { Button } from '@/components/ui/button.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import Editor from '@monaco-editor/react';
import { observer } from 'mobx-react';
import { type FC } from 'react';

interface AnalysisViewProps {}

export const AnalysisView: FC<AnalysisViewProps> = observer(() => {
	const { themeStore } = useStore();
	const json = JSON.stringify({ name: 'John Doe', age: 30 }, null, 2);

	return (
		<div className="flex flex-col h-full">
			<div className="shrink-0 overflow-hidden">
				<Button onClick={() => {}} variant="outline" size="sm">
					New Application
				</Button>
			</div>
			<div className="flex-1 overflow-hidden">
				<Editor
					height="100%"
					defaultLanguage="json"
					theme={
						themeStore.resolvedTheme === 'dark' ? 'vs-dark' : 'vs'
					}
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
});
