import { useMutation } from '@apollo/client/react';
import { type FC, type FormEvent, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CREATE_APPLICATION } from '../graphql/mutations';
import { useStore } from '../stores/store.provider';
import { useFileManager } from './FileManager/FileManager.provider';
import type {
	CreateApplicationData,
	CreateApplicationVariables,
} from '../graphql/types';

interface CreateApplicationDialogProps {
	children: React.ReactNode;
}

export const CreateApplicationDialog: FC<CreateApplicationDialogProps> = ({
	children,
}) => {
	const navigate = useNavigate();
	const { applicationStore, resumeStore } = useStore();
	const { selectApiApplication } = useFileManager();
	const [open, setOpen] = useState(false);
	const [createApplication, { loading }] = useMutation<
		CreateApplicationData,
		CreateApplicationVariables
	>(CREATE_APPLICATION);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = (formData.get('name') as string).trim();
		const company = (formData.get('company') as string).trim();
		const jobPostingUrl = (formData.get('jobPostingUrl') as string).trim();

		const result = await createApplication({
			variables: {
				applicationData: {
					name,
					company,
					jobPostingUrl,
				},
			},
		});

		setOpen(false);
		await Promise.all([applicationStore.refetch(), resumeStore.refetch()]);

		const newApplicationId = result.data?.createApplication?._id;
		if (newApplicationId) {
			await selectApiApplication(newApplicationId);
			navigate({
				to: '/editor/$applicationId',
				params: { applicationId: newApplicationId },
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Application</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							name="name"
							placeholder="Frontend Engineer"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="company">Company</Label>
						<Input
							id="company"
							name="company"
							placeholder="Acme Corp"
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="jobPostingUrl">Job Posting URL</Label>
						<Input
							id="jobPostingUrl"
							name="jobPostingUrl"
							type="url"
							placeholder="https://example.com/job/123"
							required
						/>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
