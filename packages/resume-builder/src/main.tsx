import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { RootStore } from './stores/root.store.ts';
import { StoreProvider } from './stores/store.provider.tsx';
import { Auth0Provider } from './components/Auth0Provider.tsx';
import { Auth0SyncProvider } from './components/Auth0SyncProvider.tsx';

import './index.css';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

const store = RootStore.getInstance();

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		store,
	},
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Auth0Provider>
			<StoreProvider>
				<Auth0SyncProvider>
					<RouterProvider router={router} context={{ store }} />
				</Auth0SyncProvider>
			</StoreProvider>
		</Auth0Provider>
	</StrictMode>,
);
