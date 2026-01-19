import { createRootRouteWithContext } from '@tanstack/react-router';
import { App } from '../App.tsx';
import type { RootStore } from '../stores/root.store.ts';

interface RouterContext {
	store: RootStore;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return <App />;
}
