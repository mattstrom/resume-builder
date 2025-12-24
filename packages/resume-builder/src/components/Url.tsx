import { type FC } from 'react';

interface UrlProps {
	href: string;
}

export const Url: FC<UrlProps> = ({ href }) => {
	const displayName = href.replace(/^https:\/\//, '');

	return <a href={href}>{displayName}</a>;
};
