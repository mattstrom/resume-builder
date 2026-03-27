import { useAuth0 } from '@auth0/auth0-react';
import { type FC, type PropsWithChildren, useEffect } from 'react';
import { useStore } from '../stores/store.provider.tsx';

export const Auth0SyncProvider: FC<PropsWithChildren> = ({ children }) => {
	const { isLoading, isAuthenticated, user, loginWithRedirect, logout } =
		useAuth0();
	const { authStore } = useStore();

	useEffect(() => {
		authStore.syncFromAuth0({ isLoading, isAuthenticated, user });
	}, [isLoading, isAuthenticated, user, authStore]);

	useEffect(() => {
		authStore.setLoginHandler(() => loginWithRedirect());
		authStore.setLogoutHandler((opts) => logout(opts));
	}, [loginWithRedirect, logout, authStore]);

	return <>{children}</>;
};
