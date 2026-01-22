import { type FC } from 'react';
import { useSettings } from './Settings.provider.tsx';
import { FileManager } from './FileManager';
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

interface ControlsProps {}

export const Controls: FC<ControlsProps> = () => {
	const { template, setTemplate, showMarginPattern, setShowMarginPattern } =
		useSettings();

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

	return (
		<div>
			<FileManager />

			<Separator className="my-4" />

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="template">Template</Label>
					<Select value={template} onValueChange={setTemplate}>
						<SelectTrigger id="template">
							<SelectValue placeholder="Select template" />
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
						onCheckedChange={(checked: boolean) => {
							setShowMarginPattern(checked === true);
						}}
					/>
					<Label htmlFor="marginPattern">Show Margin Pattern</Label>
				</div>
				<div>
					<Button onClick={onPrint}>Print</Button>
				</div>
			</div>
		</div>
	);
};
