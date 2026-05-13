import { Loader2 } from 'lucide-react';
import type { FC } from 'react';

export const RouteLoading: FC = () => {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<Loader2 className="h-8 w-8 animate-spin text-foreground" />
		</div>
	);
};
