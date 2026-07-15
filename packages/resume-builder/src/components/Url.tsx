import { type FC } from 'react';

import { formatWebUrl, normalizeWebUrl, ResumeLink } from '@/components/ResumeLink.tsx';

interface UrlProps {
	href: string;
}

export const Url: FC<UrlProps> = ({ href }) => {
	return <ResumeLink href={normalizeWebUrl(href) ?? undefined}>{formatWebUrl(href)}</ResumeLink>;
};
