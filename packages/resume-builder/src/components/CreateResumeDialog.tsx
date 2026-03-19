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
import { CREATE_BLANK_RESUME } from '../graphql/mutations';
import { useStore } from '../stores/store.provider';
import { useFileManager } from './FileManager/FileManager.provider';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-');
}

interface CreateResumeDialogProps {
	children: React.ReactNode;
}

export const CreateResumeDialog: FC<CreateResumeDialogProps> = ({
	children,
}) => {
	const navigate = useNavigate();
	const { resumeStore } = useStore();
	const { selectApiResume } = useFileManager();
	const [open, setOpen] = useState(false);
	const [createBlankResume, { loading }] = useMutation<{
		createBlankResume: { _id: string };
	}>(CREATE_BLANK_RESUME);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = (formData.get('name') as string).trim();
		const company = (formData.get('company') as string).trim();
		const level = (formData.get('level') as string).trim() || undefined;
		const jobPostingUrl = (formData.get('jobPostingUrl') as string).trim();

		const id = slugify(name);

		const { data } = await createBlankResume({
			variables: {
				resumeData: {
					id,
					name,
					company,
					level,
					jobPostingUrl,
				},
			},
		});

		setOpen(false);
		await resumeStore.refetch();

		const newResumeId = data?.createBlankResume?._id;
		if (newResumeId) {
			selectApiResume(newResumeId);
			navigate({
				to: '/editor/$resumeId',
				params: { resumeId: newResumeId },
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Resume</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							name="name"
							placeholder="My Resume"
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
						<Label htmlFor="level">Level</Label>
						<Input
							id="level"
							name="level"
							placeholder="Senior (optional)"
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
