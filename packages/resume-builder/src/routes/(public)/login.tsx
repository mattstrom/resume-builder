import { observer } from 'mobx-react';
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
import { useStore } from '../../stores/store.provider.tsx';

const LoginPage = observer(() => {
	const { authStore } = useStore();

	if (!authStore.isInitialized) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-foreground" />
			</div>
		);
	}

	if (authStore.isAuthenticated) {
		return <Navigate to="/editor" />;
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<Card className="w-[400px]">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Resume Builder</CardTitle>
					<CardDescription>
						Sign in to create and manage your resumes
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={() => authStore.login()}
						className="w-full"
						size="lg"
					>
						Log in
					</Button>
				</CardContent>
			</Card>
		</div>
	);
});

export const Route = createFileRoute('/(public)/login')({
	component: LoginPage,
});
