import { type FC } from 'react';
import ReactMarkdown from 'react-markdown';

import { ResumeLink, sanitizeResumeHref } from '@/components/ResumeLink.tsx';

export const LINK_MARKUP_HINT =
	'Links: [Portfolio](https://example.com), [Projects](#projects), or [Project](#project-ID)';

interface InlineMarkdownProps {
	value: string;
	isEditable?: boolean;
	onEditRequest?: () => void;
}

export const InlineMarkdown: FC<InlineMarkdownProps> = ({
	value,
	isEditable = false,
	onEditRequest,
}) => {
	return (
		<ReactMarkdown
			skipHtml
			allowedElements={['a', 'p', 'strong', 'em', 'del', 'code', 'br']}
			unwrapDisallowed
			urlTransform={(href) => sanitizeResumeHref(href) ?? ''}
			components={{
				p: ({ children }) => <>{children}</>,
				a: ({ href, children }) => (
					<ResumeLink href={href} isEditable={isEditable} onEditRequest={onEditRequest}>
						{children}
					</ResumeLink>
				),
			}}
		>
			{value}
		</ReactMarkdown>
	);
};

export const LinkMarkupHint: FC = () => (
	<span className="text-xs text-muted-foreground">{LINK_MARKUP_HINT}</span>
);
