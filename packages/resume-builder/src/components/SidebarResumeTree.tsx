import { observer } from 'mobx-react';
import { type FC, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FileIcon, RotateCw } from 'lucide-react';
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useStore } from '../stores/store.provider';
import { useFileManager } from './FileManager/FileManager.provider';

export const SidebarResumeTree: FC = observer(() => {
	const navigate = useNavigate();
	const { resumeStore } = useStore();
	const { selectedApiResumeId, selectApiResume } = useFileManager();

	const resumes = resumeStore.data;

	const handleSelect = useCallback(
		(resumeId: string) => {
			selectApiResume(resumeId);
			navigate({
				to: '/editor/$resumeId',
				params: { resumeId },
			});
		},
		[selectApiResume, navigate],
	);

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Resumes</SidebarGroupLabel>
			<SidebarGroupAction
				title="Refresh resumes"
				onClick={() => resumeStore.refetch()}
			>
				<RotateCw />
			</SidebarGroupAction>
			<SidebarGroupContent>
				<SidebarMenu>
					{resumes.length === 0 ? (
						<p className="px-2 text-xs text-sidebar-foreground/50">
							No resumes found.
						</p>
					) : (
						resumes.map((resume) => (
							<SidebarMenuItem key={resume._id}>
								<SidebarMenuButton
									isActive={
										selectedApiResumeId === resume._id
									}
									onClick={() => handleSelect(resume._id)}
									tooltip={resume.name}
								>
									<FileIcon />
									<span>{resume.name}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
});
