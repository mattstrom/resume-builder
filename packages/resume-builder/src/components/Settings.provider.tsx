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
	editorMode: 'form' | 'review';
	setEditorMode: Dispatch<SetStateAction<'form' | 'review'>>;
	viewMode: 'data' | 'layout';
	setViewMode: Dispatch<SetStateAction<'data' | 'layout'>>;
	sidebarOpen: boolean;
	setSidebarOpen: Dispatch<SetStateAction<boolean>>;
	chatOpen: boolean;
	setChatOpen: Dispatch<SetStateAction<boolean>>;
}

export const SettingsContext = createContext<Settings | null>(null);

export const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
	const [template, setTemplate] = useLocalStorage('resume:template', 'grid');
	const [showMarginPattern, setShowMarginPattern] = useLocalStorage(
		'resume:showMarginPattern',
		true,
	);
	const [editorMode, setEditorMode] = useLocalStorage<'form' | 'review'>(
		'resume:editorMode',
		'form',
	);
	const [viewMode, setViewMode] = useLocalStorage<'data' | 'layout'>(
		'resume:viewMode',
		'layout',
	);
	const [sidebarOpen, setSidebarOpen] = useLocalStorage(
		'resume:sidebarOpen',
		true,
	);
	const [chatOpen, setChatOpen] = useLocalStorage('resume:chatOpen', false);

	const settings = {
		template,
		setTemplate,
		showMarginPattern,
		setShowMarginPattern,
		editorMode,
		setEditorMode,
		viewMode,
		setViewMode,
		sidebarOpen,
		setSidebarOpen,
		chatOpen,
		setChatOpen,
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
