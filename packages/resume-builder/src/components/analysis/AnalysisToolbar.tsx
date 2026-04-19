import { CreateApplicationDialog } from '@/components/CreateResumeDialog';
import { useSnackbar } from '@/components/SnackbarProvider';
import { Button } from '@/components/ui/button';
import { useStore } from '@/stores/store.provider';
import { useParams } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useState } from 'react';

export const AnalysisToolbar: FC = observer(() => {
	const { applicationStore } = useStore();
	const { applicationId } = useParams({ strict: false });
	const { showSnackbar } = useSnackbar();
	const [isAssessing, setIsAssessing] = useState(false);

	const onAssess = async () => {
		if (!applicationId) return;
		setIsAssessing(true);
		try {
			await applicationStore.assess(applicationId);
			showSnackbar(
				'Assessment started. Results will appear shortly.',
				'success',
			);
		} catch {
			showSnackbar('Assessment failed. Please try again.', 'error');
		} finally {
			setIsAssessing(false);
		}
	};

	return (
		<div className="flex items-center gap-2 w-full">
			<CreateApplicationDialog>
				<Button variant="outline" size="sm" className="h-7 text-xs">
					Create Application
				</Button>
			</CreateApplicationDialog>

			<Button
				onClick={onAssess}
				disabled={!applicationId || isAssessing}
				variant="ghost"
				size="sm"
				className="h-7 text-xs"
			>
				{isAssessing ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
						Assessing...
					</>
				) : (
					'Assess Fit'
				)}
			</Button>
		</div>
	);
});
