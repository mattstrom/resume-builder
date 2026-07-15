import { type AnchorHTMLAttributes, type FC, type MouseEvent, type PropsWithChildren } from 'react';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export type ResumeLinkClickAction = 'edit' | 'follow';

export function getResumeLinkClickAction(
	isEditable: boolean,
	event: Pick<MouseEvent<HTMLAnchorElement>, 'ctrlKey' | 'metaKey'>,
): ResumeLinkClickAction {
	return isEditable && !event.ctrlKey && !event.metaKey ? 'edit' : 'follow';
}

export function sanitizeResumeHref(href: string | undefined): string | null {
	const value = href?.trim();

	if (!value) return null;

	if (value.startsWith('#')) {
		return /^#[A-Za-z][\w:.-]*$/.test(value) ? value : null;
	}

	try {
		const url = new URL(value);
		return ALLOWED_PROTOCOLS.has(url.protocol) ? value : null;
	} catch {
		return null;
	}
}

export function normalizeWebUrl(value: string): string | null {
	const trimmed = value.trim();

	if (!trimmed) return null;

	const candidate = /^[A-Za-z][A-Za-z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

	const sanitized = sanitizeResumeHref(candidate);
	return sanitized?.startsWith('http:') || sanitized?.startsWith('https:') ? sanitized : null;
}

export function formatWebUrl(value: string): string {
	return value
		.trim()
		.replace(/^https?:\/\//, '')
		.replace(/\/$/, '');
}

interface ResumeLinkProps
	extends PropsWithChildren, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
	href?: string;
	isEditable?: boolean;
	onEditRequest?: () => void;
}

export const ResumeLink: FC<ResumeLinkProps> = ({
	href,
	isEditable = false,
	onEditRequest,
	children,
	style,
	...props
}) => {
	const safeHref = sanitizeResumeHref(href);

	if (!safeHref) return <>{children}</>;

	const opensNewTab = safeHref.startsWith('http:') || safeHref.startsWith('https:');
	const isInternal = safeHref.startsWith('#');

	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (getResumeLinkClickAction(isEditable, event) === 'follow') {
			event.stopPropagation();
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onEditRequest?.();
	};

	return (
		<a
			href={safeHref}
			target={opensNewTab ? '_blank' : undefined}
			rel={opensNewTab ? 'noopener noreferrer' : undefined}
			style={isInternal ? { ...style, color: 'inherit' } : style}
			onClick={handleClick}
			{...props}
		>
			{children}
		</a>
	);
};
