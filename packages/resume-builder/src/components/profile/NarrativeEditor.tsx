import { useStore } from '@/stores/store.provider.tsx';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import { type FC, useEffect, useRef } from 'react';
import { MonacoBinding } from 'y-monaco';

export const NarrativeEditor: FC = observer(() => {
	const { profileStore, themeStore } = useStore();
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const bindingRef = useRef<MonacoBinding | null>(null);

	useEffect(() => {
		void profileStore.connect();
		return () => profileStore.disconnect();
	}, [profileStore]);

	// Attach the Monaco binding as soon as both the editor and the Y.Text
	// are available. Re-attach if the Y.Text reference changes (e.g. after
	// initial sync replaces it with the server's authoritative copy).
	useEffect(() => {
		return autorun(() => {
			const text = profileStore.narrativeText;
			const editor = editorRef.current;

			bindingRef.current?.destroy();
			bindingRef.current = null;

			if (!text || !editor) {
				return;
			}

			const model = editor.getModel();
			if (!model) {
				return;
			}

			bindingRef.current = new MonacoBinding(
				text,
				model,
				new Set([editor]),
				profileStore.awareness ?? undefined,
			);
		});
	}, [profileStore]);

	const handleEditorMount: OnMount = (editor) => {
		editorRef.current = editor;
		// Kick the autorun by reading narrativeText once after the ref lands.
		const text = profileStore.narrativeText;
		if (text) {
			bindingRef.current?.destroy();
			bindingRef.current = new MonacoBinding(
				text,
				editor.getModel()!,
				new Set([editor]),
				profileStore.awareness ?? undefined,
			);
		}
	};

	return (
		<div className="flex h-full w-full flex-col gap-3 p-6">
			<div className="flex items-baseline justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Narrative
					</h1>
					<p className="text-sm text-muted-foreground">
						Describe your work history in your own words. This will
						be used to extract structured data later.
					</p>
				</div>
				<span className="text-xs text-muted-foreground">
					{profileStore.status}
				</span>
			</div>
			<div className="flex-1 overflow-hidden rounded-md border border-input bg-background shadow-sm">
				<Editor
					height="100%"
					defaultLanguage="markdown"
					theme={
						themeStore.resolvedTheme === 'dark' ? 'vs-dark' : 'vs'
					}
					onMount={handleEditorMount}
					options={{
						minimap: { enabled: false },
						wordWrap: 'on',
						lineNumbers: 'off',
						scrollBeyondLastLine: false,
						automaticLayout: true,
						fontSize: 14,
						padding: { top: 16, bottom: 16 },
					}}
				/>
			</div>
		</div>
	);
});
