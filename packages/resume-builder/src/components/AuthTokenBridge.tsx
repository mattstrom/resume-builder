import { useAuth0 } from '@auth0/auth0-react';
import { type FC, useEffect } from 'react';

import { setTokenGetter } from '../apollo-client';

export const AuthTokenBridge: FC = () => {
	const { getAccessTokenSilently, isAuthenticated } = useAuth0();

	useEffect(() => {
		if (isAuthenticated) {
			setTokenGetter(() =>
				getAccessTokenSilently({
					authorizationParams: {
						audience: __CONFIG__.auth0.audience,
					},
				}),
			);
		}
	}, [isAuthenticated, getAccessTokenSilently]);

	return null;
};
