import { observer } from 'mobx-react';
import { type FC } from 'react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { FolderOpen, RotateCw, X } from 'lucide-react';
import { useFileManager } from './FileManager.provider';

export const FileManagerToolbar: FC = observer(() => {
	const {
		directoryName,
		files,
		selectedFile,
		isLoading,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
	} = useFileManager();

	if (!isSupported) {
		return null;
	}

	return (
		<TooltipProvider>
			<div className="flex gap-2 items-center">
				{/* Local Files Section */}
				{!directoryName ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								onClick={attachDirectory}
								size="sm"
								className="text-white border-white/50 hover:border-white hover:bg-white/10"
							>
								<FolderOpen className="mr-2 h-4 w-4" />
								Local Files
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Attach a local directory to load resume files</p>
						</TooltipContent>
					</Tooltip>
				) : (
					<div className="flex gap-1 items-center">
						{files.length > 0 && (
							<Select
								value={selectedFile ?? ''}
								onValueChange={selectFile}
								disabled={isLoading}
							>
								<SelectTrigger className="w-[150px] text-white border-white/30 hover:border-white/50 focus:border-white [&_svg]:text-white">
									<SelectValue placeholder="Local File" />
								</SelectTrigger>
								<SelectContent>
									{files.map((file) => (
										<SelectItem key={file} value={file}>
											{file}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={refreshFiles}
									className="text-white hover:bg-white/10"
								>
									<RotateCw className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Refresh files</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={detachDirectory}
									className="text-white hover:bg-white/10"
								>
									<X className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Detach directory</p>
							</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
});
