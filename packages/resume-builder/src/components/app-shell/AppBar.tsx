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
import { useSidebar } from '@/components/ui/sidebar';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Mode, ViewMode } from '@/stores/ui-state.store.ts';
import { useParams } from '@tanstack/react-router';
import {
	Loader2,
	MessageCircle,
	PanelLeftClose,
	PanelLeftOpen,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { type FC, useState } from 'react';

import { useStore } from '../../stores/store.provider.tsx';
import { generatePDF } from '../../utils/pdfExport';
import { useFileManager } from '../FileManager';
import { useSettings } from '../Settings.provider.tsx';
import { useSnackbar } from '../SnackbarProvider';

// Custom ToggleGroup component (no direct ShadCN equivalent)
interface ToggleGroupProps {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}

const ToggleGroup: FC<ToggleGroupProps> = ({ value, onChange, options }) => (
	<div className="inline-flex rounded-md border border-border">
		{options.map((opt, idx) => (
			<Button
				key={opt.value}
				variant="ghost"
				size="sm"
				className={cn(
					'rounded-none border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
					idx === 0 && 'rounded-l-md',
					idx === options.length - 1 && 'rounded-r-md',
					idx > 0 && 'border-l',
					value === opt.value &&
						'bg-accent text-accent-foreground hover:bg-accent',
				)}
				onClick={() => onChange(opt.value)}
			>
				{opt.label}
			</Button>
		))}
	</div>
);

export const AppBar: FC = observer(() => {
	const { template, setTemplate, showMarginPattern, setShowMarginPattern } =
		useSettings();
	const { uiStateStore } = useStore();
	const { chatOpen } = uiStateStore;
	const { open: sidebarOpen, toggleSidebar } = useSidebar();

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
		<header className="bg-card text-card-foreground border-b border-border">
			<div className="flex items-center gap-4 flex-wrap p-4">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={toggleSidebar}
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

				<Separator orientation="vertical" className="h-6" />

				<ToggleGroup
					value={uiStateStore.mode}
					onChange={(newMode) => {
						uiStateStore.setMode(newMode as Mode);
					}}
					options={[
						{ value: Mode.Analysis, label: 'Analysis' },
						{ value: Mode.Tailor, label: 'Tailor' },
						{ value: Mode.Form, label: 'Form' },
						{ value: Mode.Edit, label: 'Edit' },
						{ value: Mode.Review, label: 'Review' },
					]}
				/>

				<Separator orientation="vertical" className="h-6" />

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

				<Separator orientation="vertical" className="h-6" />

				<div className="flex items-center gap-2">
					<Label htmlFor="template" className="text-sm">
						Template
					</Label>
					<Select value={template} onValueChange={setTemplate}>
						<SelectTrigger id="template" className="w-[120px] h-9">
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
						onCheckedChange={(checked) =>
							setShowMarginPattern(checked === true)
						}
					/>
					<Label
						htmlFor="marginPattern"
						className="text-sm cursor-pointer"
					>
						Show Margin Pattern
					</Label>
				</div>

				<Button onClick={onPrint} variant="outline" size="sm">
					Print
				</Button>

				<Button
					onClick={onExportPDF}
					disabled={isExporting}
					variant="outline"
					size="sm"
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

				<Button onClick={onPreview} variant="outline" size="sm">
					Preview
				</Button>

				{resumeData?.jobPostingUrl && (
					<Button
						onClick={() =>
							window.open(resumeData.jobPostingUrl, '_blank')
						}
						variant="outline"
						size="sm"
					>
						Open Job Posting
					</Button>
				)}
				<div className="ml-auto flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={chatOpen ? 'secondary' : 'ghost'}
									size="icon"
									className="h-8 w-8"
									onClick={() => uiStateStore.setChatOpen()}
									aria-label={
										chatOpen ? 'Close chat' : 'Open chat'
									}
								>
									<MessageCircle className="h-5 w-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Toggle AI chat
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</header>
	);
});
