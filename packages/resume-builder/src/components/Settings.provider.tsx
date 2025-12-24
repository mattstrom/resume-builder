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
}

export const SettingsContext = createContext<Settings | null>(null);

export const SettingsProvider: FC<PropsWithChildren> = ({ children }) => {
	const [template, setTemplate] = useState('basic');

	const settings = {
		template,
		setTemplate,
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
