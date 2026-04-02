import { type FC } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, RotateCw, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useFileManager } from './FileManager.provider';

export const FileManager: FC = () => {
	const navigate = useNavigate();
	const {
		directoryName,
		files,
		selectedFile,
		apiApplications,
		selectedApiApplicationId,
		isLoading,
		error,
		isSupported,
		attachDirectory,
		detachDirectory,
		selectFile,
		refreshFiles,
		loadApiApplications,
		selectApiApplication,
	} = useFileManager();

	if (!isSupported) {
		return (
			<Alert className="mb-4">
				<AlertDescription>
					File System Access API is not supported in this browser.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="mb-4">
			{/* API Applications Section */}
			<h3 className="text-sm font-semibold mb-2">Backend Applications</h3>

			{apiApplications.length > 0 && (
				<div className="mb-4">
					<Select
						value={selectedApiApplicationId ?? ''}
						onValueChange={(applicationId: string) => {
							selectApiApplication(applicationId);
							navigate({
								to: '/editor/$applicationId',
								params: { applicationId },
							});
						}}
						disabled={isLoading}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select Application" />
						</SelectTrigger>
						<SelectContent>
							{apiApplications.map((application) => (
								<SelectItem
									key={application._id}
									value={application._id}
								>
									{application.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{apiApplications.length === 0 && !isLoading && (
				<div className="mb-4">
					<p className="text-sm text-muted-foreground mb-2">
						No applications available from backend
					</p>
					<Button
						variant="ghost"
						size="sm"
						onClick={loadApiApplications}
					>
						<RotateCw className="mr-2 h-4 w-4" />
						Retry
					</Button>
				</div>
			)}

			{/* Local Files Section */}
			<h3 className="text-sm font-semibold mb-2 mt-4">
				Local Resume File
			</h3>

			{!directoryName ? (
				<Button
					variant="outline"
					onClick={attachDirectory}
					className="w-full"
				>
					<FolderOpen className="mr-2 h-4 w-4" />
					Attach Directory
				</Button>
			) : (
				<>
					<div className="flex items-center gap-2 mb-2">
						<FolderOpen className="h-4 w-4" />
						<span className="text-sm flex-1">{directoryName}</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={refreshFiles}
							title="Refresh"
						>
							<RotateCw className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={detachDirectory}
							title="Detach"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{files.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No JSON files found
						</p>
					) : (
						<Select
							value={selectedFile ?? ''}
							onValueChange={selectFile}
							disabled={isLoading}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select File" />
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
				</>
			)}

			{isLoading && (
				<div className="flex justify-center mt-2">
					<Loader2 className="h-5 w-5 animate-spin" />
				</div>
			)}

			{error && (
				<Alert variant="destructive" className="mt-2">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
};
