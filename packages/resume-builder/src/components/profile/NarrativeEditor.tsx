import type { HocuspocusProvider } from '@hocuspocus/provider';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { observer } from 'mobx-react';
import { type FC, useEffect } from 'react';
import type * as Y from 'yjs';

import { useStore } from '@/stores/store.provider.tsx';

import { Details } from './extensions/details.extension.tsx';
import { JobBlock } from './extensions/job-block.extension.tsx';
import { Markup } from './extensions/markup.extension.ts';
import { NarrativeBubbleMenu } from './NarrativeBubbleMenu.tsx';
import { NarrativeToolbar } from './NarrativeToolbar.tsx';

import './tiptap.css';

// NOTE: Marks and nodes here are read generically by the server (see
// elementToStructured/buildElement in
// packages/crdt/src/modules/api/api.service.ts), which exposes each text
// run's marks as a name-keyed record. No server-side change is needed to
// add a new mark or node here.
const buildExtensions = (doc: Y.Doc, provider: HocuspocusProvider, userName: string) => [
	// Collaboration provides undo/redo via the Yjs undo manager, so disable
	// StarterKit's history extension.
	StarterKit.configure({ undoRedo: false }),
	Placeholder.configure({
		placeholder: 'Describe your work history…',
	}),
	Highlight,
	Markup,
	TextAlign.configure({ types: ['heading', 'paragraph'] }),
	Table.configure({ resizable: true }),
	TableRow,
	TableCell,
	TableHeader,
	TextStyle,
	FontFamily,
	TaskList,
	TaskItem.configure({ nested: true }),
	Details,
	JobBlock,
	Collaboration.configure({
		document: doc,
		field: 'narrative',
	}),
	CollaborationCaret.configure({
		provider,
		user: {
			name: userName,
			color: pickUserColor(userName),
		},
	}),
];

function pickUserColor(seed: string): string {
	// Stable pastel color per user name. Keeps caret/selection visually
	// distinct without shipping a heavier awareness model.
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 70%, 60%)`;
}

interface EditorShellProps {
	doc: Y.Doc;
	provider: HocuspocusProvider;
	userName: string;
}

/**
 * Inner editor shell. Keyed on the Y.Doc identity from the parent so the
 * Tiptap editor is torn down and re-created on reconnect.
 */
const EditorShell: FC<EditorShellProps> = ({ doc, provider, userName }) => {
	const editor = useEditor({
		extensions: buildExtensions(doc, provider, userName),
		editorProps: {
			attributes: {
				class: 'tiptap-content',
			},
		},
	});

	return (
		<div className="flex flex-1 flex-col overflow-hidden rounded-md border border-input bg-background shadow-sm">
			<NarrativeToolbar editor={editor} />
			<NarrativeBubbleMenu editor={editor} />
			<div className="flex-1 overflow-auto">
				<EditorContent editor={editor} className="h-full" />
			</div>
		</div>
	);
};

export const NarrativeEditor: FC = observer(() => {
	const { authStore, profileStore } = useStore();

	useEffect(() => {
		void profileStore.connect();
		return () => profileStore.disconnect();
	}, [profileStore]);

	const doc = profileStore.doc;
	const provider = profileStore.provider;
	const user = authStore.user;
	const userName = user?.name ?? user?.email ?? 'Anonymous';

	return (
		<div className="flex h-full w-full flex-col gap-3 p-6">
			<div className="flex items-baseline justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Narrative</h1>
					<p className="text-sm text-muted-foreground">
						Describe your work history in your own words. This will be used to extract
						structured data later.
					</p>
				</div>
				<span className="text-xs text-muted-foreground">{profileStore.status}</span>
			</div>
			{doc && provider ? (
				<EditorShell key={doc.guid} doc={doc} provider={provider} userName={userName} />
			) : (
				<div className="flex flex-1 items-center justify-center rounded-md border border-input bg-background text-sm text-muted-foreground shadow-sm">
					Connecting…
				</div>
			)}
		</div>
	);
});
