import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import './index.css';

// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { RootStore } from './stores/root.store.ts';
import { StoreProvider } from './stores/store.provider.tsx';

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
		<StoreProvider>
			<RouterProvider router={router} context={{ store }} />
		</StoreProvider>
	</StrictMode>,
);
