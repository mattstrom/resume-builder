import {
	createContext,
	type FC,
	type PropsWithChildren,
	useContext,
} from 'react';
import { RootStore } from './root.store.ts';

const StoreContext = createContext<RootStore | null>(null);
let singleton: RootStore;

interface StoreProviderProps extends PropsWithChildren {
	store?: RootStore;
}

export const StoreProvider: FC<StoreProviderProps> = ({ children, store }) => {
	singleton ??= store ?? RootStore.getInstance();

	return (
		<StoreContext.Provider value={singleton}>
			{children}
		</StoreContext.Provider>
	);
};

export function useStore() {
	const store = useContext(StoreContext);

	if (!store) {
		throw new Error('useStore() must be used within a StoreProvider');
	}

	return store;
}
