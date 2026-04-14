import { type FC, type PropsWithChildren } from 'react';

/**
 * A basic layout component that centers its children both vertically and
 * horizontally within a container. The component ensures that the content is
 * displayed in a flexbox layout, aligned to the center, and styled with padding
 * and text alignment.
 */
export const Centered: FC<PropsWithChildren> = ({ children }) => {
	return (
		<div className="flex flex-col items-center justify-center h-full p-6 text-center">
			{children}
		</div>
	);
};
