import { Auth0Provider as BaseAuth0Provider } from '@auth0/auth0-react';
import { type FC, type PropsWithChildren } from 'react';

export const Auth0Provider: FC<PropsWithChildren> = ({ children }) => {
	const { domain, clientId, audience, scope } = __CONFIG__.auth0;

	if (!domain || !clientId) {
		console.error('Auth0 domain or clientId is missing');
		return <>{children}</>;
	}

	return (
		<BaseAuth0Provider
			domain={domain}
			clientId={clientId}
			cacheLocation="localstorage"
			useRefreshTokens
			authorizationParams={{
				redirect_uri: window.location.origin,
				audience,
				scope,
			}}
		>
			{children}
		</BaseAuth0Provider>
	);
};
