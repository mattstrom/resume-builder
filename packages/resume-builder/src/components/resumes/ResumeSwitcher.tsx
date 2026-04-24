import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/stores/store.provider.tsx';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, type FormEvent, useState } from 'react';

export const ResumeSwitcher: FC = observer(() => {
	const { editorStore } = useStore();
	const {
		selectedApiApplicationId,
		selectedApplication,
		applicationResumes,
		resumeData,
	} = editorStore;
	const [dialogOpen, setDialogOpen] = useState(false);
	const [creating, setCreating] = useState(false);

	if (!selectedApiApplicationId) {
		return null;
	}

	const defaultName = selectedApplication
		? `${selectedApplication.name} Resume`
		: 'Resume';

	const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const name = (
			new FormData(e.currentTarget).get('name') as string
		).trim();
		if (!name) return;
		setCreating(true);
		try {
			await editorStore.createResumeForApplication(name);
			setDialogOpen(false);
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="flex items-center gap-1 shrink-0">
			{applicationResumes.length > 1 ? (
				<Select
					value={resumeData?._id ?? ''}
					onValueChange={(id) => void editorStore.selectResume(id)}
				>
					<SelectTrigger className="h-7 text-xs w-[160px] border-border/60">
						<SelectValue placeholder="Select resume" />
					</SelectTrigger>
					<SelectContent>
						{applicationResumes.map((r) => (
							<SelectItem
								key={r._id}
								value={r._id}
								className="text-xs"
							>
								{r.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : (
				<span className="text-xs text-muted-foreground px-1">
					{resumeData?.name ?? 'No resume'}
				</span>
			)}

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
				onClick={() => setDialogOpen(true)}
				title="New resume for this application"
			>
				<Plus className="h-3.5 w-3.5" />
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Resume</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreate} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="resume-name">Name</Label>
							<Input
								id="resume-name"
								name="name"
								defaultValue={defaultName}
								required
								autoFocus
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={creating}>
								{creating ? 'Creating...' : 'Create'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
});
