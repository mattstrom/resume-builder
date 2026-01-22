import {
	createContext,
	type Dispatch,
	type FC,
	type PropsWithChildren,
	type SetStateAction,
	useContext,
} from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

interface Settings {
	template: string;
	setTemplate: Dispatch<SetStateAction<string>>;
	showMarginPattern: boolean;
	setShowMarginPattern: Dispatch<SetStateAction<boolean>>;
	editorMode: 'json' | 'form' | 'review';
	setEditorMode: Dispatch<SetStateAction<'json' | 'form' | 'review'>>;
}

export const SettingsContext = createContext<Settings | null>(null);

export const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
	const [template, setTemplate] = useLocalStorage('resume:template', 'grid');
	const [showMarginPattern, setShowMarginPattern] = useLocalStorage(
		'resume:showMarginPattern',
		true,
	);
	const [editorMode, setEditorMode] = useLocalStorage<
		'json' | 'form' | 'review'
	>('resume:editorMode', 'json');

	const settings = {
		template,
		setTemplate,
		showMarginPattern,
		setShowMarginPattern,
		editorMode,
		setEditorMode,
	};

	return (
		<SettingsContext.Provider value={settings}>
			{children}
		</SettingsContext.Provider>
	);
};

export function useSettings() {
	const settings = useContext(SettingsContext);

	if (!settings) {
		throw new Error('useSettings() must be used within a SettingsProvider');
	}

	return settings;
}
