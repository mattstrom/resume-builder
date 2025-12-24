import {
	createContext,
	type Dispatch,
	type FC,
	type PropsWithChildren,
	type SetStateAction,
	useContext,
	useState,
} from 'react';

interface Settings {
	template: string;
	setTemplate: Dispatch<SetStateAction<string>>;
	showMarginPattern: boolean;
	setShowMarginPattern: Dispatch<SetStateAction<boolean>>;
}

export const SettingsContext = createContext<Settings | null>(null);

export const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
	const [template, setTemplate] = useState('column');
	const [showMarginPattern, setShowMarginPattern] = useState(true);

	const settings = {
		template,
		setTemplate,
		showMarginPattern,
		setShowMarginPattern,
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
