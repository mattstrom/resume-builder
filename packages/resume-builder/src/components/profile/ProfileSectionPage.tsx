import type { FC, ReactNode } from 'react';

interface ProfileSectionPageProps {
	title: string;
	description: string;
	children: ReactNode;
}

export const ProfileSectionPage: FC<ProfileSectionPageProps> = ({
	title,
	description,
	children,
}) => (
	<div className="flex h-full w-full flex-col gap-8 overflow-y-auto p-6">
		<div>
			<h1 className="text-2xl font-semibold text-foreground">{title}</h1>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
		{children}
	</div>
);
