import type { FC } from 'react';
import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const RouteError: FC<ErrorComponentProps> = ({ error }) => {
	const errorMessage =
		error instanceof Error ? error.message : 'An unexpected error occurred';
	const isNotFound =
		errorMessage.includes('404') || errorMessage.includes('not found');

	return (
		<div className="flex items-center justify-center min-h-screen bg-background p-6">
			<Card className="max-w-md">
				<CardContent className="pt-6 text-center">
					<AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
					<h1 className="text-3xl font-bold mb-2">
						{isNotFound ? 'Not Found' : 'Error'}
					</h1>
					<p className="text-muted-foreground mb-6">{errorMessage}</p>
					<Button asChild>
						<Link to="/editor">Go to Editor</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
};
