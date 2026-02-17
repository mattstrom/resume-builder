import { useParams } from '@tanstack/react-router';
import { type FC, useState } from 'react';
import { Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSettings } from './Settings.provider.tsx';
import { FileManagerToolbar, useFileManager } from './FileManager';
import { generatePDF } from '../utils/pdfExport';
import { useSnackbar } from './SnackbarProvider';

// Custom ToggleGroup component (no direct ShadCN equivalent)
interface ToggleGroupProps {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}

const ToggleGroup: FC<ToggleGroupProps> = ({ value, onChange, options }) => (
	<div className="inline-flex rounded-md border border-white/30">
		{options.map((opt, idx) => (
			<Button
				key={opt.value}
				variant={value === opt.value ? 'default' : 'ghost'}
				size="sm"
				className={cn(
					'rounded-none text-white/70 border-white/30 hover:bg-white/10 hover:text-white',
					idx === 0 && 'rounded-l-md',
					idx === options.length - 1 && 'rounded-r-md',
					idx > 0 && 'border-l',
					value === opt.value &&
						'bg-white/20 text-white border-white/50 hover:bg-white/25',
				)}
				onClick={() => onChange(opt.value)}
			>
				{opt.label}
			</Button>
		))}
	</div>
);

export const EditorToolbar: FC = () => {
	const {
		template,
		setTemplate,
		showMarginPattern,
		setShowMarginPattern,
		editorMode,
		setEditorMode,
		sidebarOpen,
		setSidebarOpen,
	} = useSettings();

	const { resumeId } = useParams({ strict: false });
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
			await generatePDF(resumeId!, resumeData || {});
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

		window.open(`/preview/${resumeId}?${params.toString()}`);
	};

	return (
		<header className="bg-slate-900 text-white border-b border-slate-800">
			<div className="flex items-center gap-4 flex-wrap p-4">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
								onClick={() => setSidebarOpen((prev) => !prev)}
								aria-label={
									sidebarOpen
										? 'Close sidebar'
										: 'Open sidebar'
								}
							>
								{sidebarOpen ? (
									<PanelLeftClose className="h-5 w-5" />
								) : (
									<PanelLeftOpen className="h-5 w-5" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							Toggle sidebar (&#8984;B)
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				<h1 className="text-xl font-semibold">Resume Builder</h1>

				<Separator orientation="vertical" className="h-6 bg-white/30" />

				<FileManagerToolbar />

				<Separator orientation="vertical" className="h-6 bg-white/30" />

				<ToggleGroup
					value={editorMode}
					onChange={(newMode) => {
						setEditorMode(newMode as 'json' | 'form' | 'review');
					}}
					options={[
						{ value: 'json', label: 'JSON' },
						{ value: 'form', label: 'Form' },
						{ value: 'review', label: 'Review' },
					]}
				/>

				<Separator orientation="vertical" className="h-6 bg-white/30" />

				<div className="flex items-center gap-2">
					<Label htmlFor="template" className="text-white text-sm">
						Template
					</Label>
					<Select value={template} onValueChange={setTemplate}>
						<SelectTrigger
							id="template"
							className="w-[120px] h-9 text-white border-white/30 hover:border-white/50 focus:border-white bg-transparent [&>svg]:text-white"
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

				<div className="flex items-center space-x-2">
					<Checkbox
						id="marginPattern"
						checked={showMarginPattern}
						onCheckedChange={(checked) => setShowMarginPattern(checked === true)}
						className="border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-slate-900 data-[state=checked]:border-white"
					/>
					<Label
						htmlFor="marginPattern"
						className="text-white text-sm cursor-pointer"
					>
						Show Margin Pattern
					</Label>
				</div>

				<Button
					onClick={onPrint}
					variant="outline"
					size="sm"
					className="text-white border-white/50 hover:border-white hover:bg-white/10"
				>
					Print
				</Button>

				<Button
					onClick={onExportPDF}
					disabled={isExporting}
					variant="outline"
					size="sm"
					className="text-white border-white/50 hover:border-white hover:bg-white/10"
				>
					{isExporting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
							Generating...
						</>
					) : (
						'Export PDF'
					)}
				</Button>

				<Button
					onClick={onPreview}
					variant="outline"
					size="sm"
					className="text-white border-white/50 hover:border-white hover:bg-white/10"
				>
					Preview
				</Button>

				{resumeData?.jobPostingUrl && (
					<Button
						onClick={() =>
							window.open(resumeData.jobPostingUrl, '_blank')
						}
						variant="outline"
						size="sm"
						className="text-white border-white/50 hover:border-white hover:bg-white/10"
					>
						Open Job Posting
					</Button>
				)}
			</div>
		</header>
	);
};
