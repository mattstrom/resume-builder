import { Stack } from '@/components/common/Stack.tsx';
import { useFileManager } from '@/components/FileManager';
import { useSettings } from '@/components/Settings.provider.tsx';
import { useSnackbar } from '@/components/SnackbarProvider.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { cn } from '@/lib/utils.ts';
import { useStore } from '@/stores/store.provider.tsx';
import { ViewMode } from '@/stores/ui-state.store.ts';
import { generatePDF } from '@/utils/pdfExport.ts';
import { useParams } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useState } from 'react';

interface ResumeToolbarProps {}

export const ResumeToolbar: FC<ResumeToolbarProps> = observer(() => {
	const { template, setTemplate, showMarginPattern, setShowMarginPattern } =
		useSettings();
	const { uiStateStore } = useStore();

	const { applicationId } = useParams({ strict: false });
	const { resumeData } = useFileManager();
	const { showSnackbar } = useSnackbar();
	const [isExporting, setIsExporting] = useState(false);

	const onPrint = () => {
		const iframe = document.getElementById(
			'resume-preview-iframe',
		) as HTMLIFrameElement;
		if (iframe?.contentWindow) {
			iframe.contentWindow.print();
		} else {
			console.error('Preview iframe not found or not ready');
		}
	};

	const onExportPDF = async () => {
		setIsExporting(true);
		try {
			await generatePDF(resumeData || {});
			showSnackbar('PDF exported successfully!', 'success');
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to export PDF. Please try again.';
			showSnackbar(message, 'error');
		} finally {
			setIsExporting(false);
		}
	};

	const onPreview = () => {
		const params = new URLSearchParams({
			template,
			showMarginPattern: String(showMarginPattern),
		});

		window.open(`/preview/${applicationId}?${params.toString()}`);
	};

	return (
		<Stack direction="row" className="items-center gap-2 w-full">
			<ToggleGroup
				value={uiStateStore.viewMode}
				onChange={(newMode) => {
					uiStateStore.setViewMode(newMode as ViewMode);
				}}
				options={[
					{ value: ViewMode.Data, label: 'Data' },
					{ value: ViewMode.Layout, label: 'Layout' },
					{ value: ViewMode.Simple, label: 'Simple' },
				]}
			/>

			<Separator orientation="vertical" className="h-5" />

			<div className="flex items-center gap-2">
				<Label
					htmlFor="template"
					className="text-xs text-muted-foreground"
				>
					Template
				</Label>
				<Select value={template} onValueChange={setTemplate}>
					<SelectTrigger
						id="template"
						className="w-[110px] h-7 text-xs"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="basic">Basic</SelectItem>
						<SelectItem value="column">Column</SelectItem>
						<SelectItem value="grid">Grid</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center gap-1.5">
				<Checkbox
					id="marginPattern"
					checked={showMarginPattern}
					onCheckedChange={(checked) =>
						setShowMarginPattern(checked === true)
					}
					className="h-3.5 w-3.5"
				/>
				<Label
					htmlFor="marginPattern"
					className="text-xs text-muted-foreground cursor-pointer"
				>
					Margin pattern
				</Label>
			</div>

			<div className="flex-1" />

			<Button
				onClick={onPrint}
				variant="ghost"
				size="sm"
				className="h-7 text-xs"
			>
				Print
			</Button>

			<Button
				onClick={onExportPDF}
				disabled={isExporting}
				variant="outline"
				size="sm"
				className="h-7 text-xs"
			>
				{isExporting ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
						Generating...
					</>
				) : (
					'Export PDF'
				)}
			</Button>

			<Button
				onClick={onPreview}
				variant="ghost"
				size="sm"
				className="h-7 text-xs"
			>
				Preview
			</Button>

			{resumeData?.jobPostingUrl && (
				<>
					<Separator orientation="vertical" className="h-5" />
					<Button
						onClick={() =>
							window.open(resumeData.jobPostingUrl, '_blank')
						}
						size="sm"
						className="h-7 text-xs"
					>
						Open job posting
					</Button>
				</>
			)}
		</Stack>
	);
});

interface ToggleGroupProps {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}

const ToggleGroup: FC<ToggleGroupProps> = ({ value, onChange, options }) => (
	<div className="inline-flex rounded-md border border-border bg-muted/30">
		{options.map((opt, idx) => (
			<Button
				key={opt.value}
				variant="ghost"
				size="sm"
				className={cn(
					'h-7 rounded-none px-3 text-xs border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
					idx === 0 && 'rounded-l-md',
					idx === options.length - 1 && 'rounded-r-md',
					idx > 0 && 'border-l',
					value === opt.value &&
						'bg-background text-foreground shadow-sm hover:bg-background',
				)}
				onClick={() => onChange(opt.value)}
			>
				{opt.label}
			</Button>
		))}
	</div>
);
