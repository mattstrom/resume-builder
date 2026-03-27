import { useAuth0 } from '@auth0/auth0-react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/_public/login')({
	component: LoginPage,
});

function LoginPage() {
	const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-white" />
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/editor" />;
	}

	return (
		<div className="min-h-screen bg-slate-950 flex items-center justify-center">
			<Card className="w-[400px] bg-slate-900 border-slate-800">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl text-white">
						Resume Builder
					</CardTitle>
					<CardDescription className="text-slate-400">
						Sign in to create and manage your resumes
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={() => loginWithRedirect()}
						className="w-full"
						size="lg"
					>
						Log in
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
