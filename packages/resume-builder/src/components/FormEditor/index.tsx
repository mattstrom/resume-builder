import { Save } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { useFileManager } from '../FileManager';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ContactInfoSection } from './sections/ContactInfoSection';
import { EducationSection } from './sections/EducationSection';
import { WorkExperienceSection } from './sections/WorkExperienceSection';
import { SkillsSection } from './sections/SkillsSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { Button } from '@/components/ui/button';
import './FormEditor.css';

interface ContactInfo {
	location: string;
	email: string;
	phoneNumber: string;
	linkedInProfile: string;
	githubProfile: string;
	personalWebsite: string;
}

interface BasicInfo {
	name: string;
	title: string;
	summary: string;
}

interface Job {
	company: string;
	position: string;
	location: string;
	startDate: string;
	endDate?: string;
	responsibilities: string[];
}

interface Skill {
	name: string;
	category: string;
}

interface Project {
	name: string;
	technologies: string[];
	items: string[];
}

interface FormData {
	basicInfo: BasicInfo;
	contactInfo: ContactInfo;
	educationIds: string[];
	workExperience: Job[];
	skills: Skill[];
	projects: Project[];
}

const defaultContactInfo: ContactInfo = {
	location: '',
	email: '',
	phoneNumber: '',
	linkedInProfile: '',
	githubProfile: '',
	personalWebsite: '',
};

const defaultBasicInfo: BasicInfo = {
	name: '',
	title: '',
	summary: '',
};

export const FormEditor: FC = () => {
	const { resumeData, updateResumeData } = useFileManager();
	const [formData, setFormData] = useState<FormData>({
		basicInfo: defaultBasicInfo,
		contactInfo: defaultContactInfo,
		educationIds: [],
		workExperience: [],
		skills: [],
		projects: [],
	});
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
	const isInternalUpdate = useRef(false);

	// Sync resumeData to form when it changes externally
	useEffect(() => {
		if (resumeData && !isInternalUpdate.current) {
			const data = resumeData.data;
			setFormData({
				basicInfo: {
					name: data.name || '',
					title: data.title || '',
					summary: data.summary || '',
				},
				contactInfo: data.contactInformation || defaultContactInfo,
				educationIds: data.education?.map((edu: any) => edu._id || edu) || [],
				workExperience: data.workExperience || [],
				skills: data.skills || [],
				projects: data.projects || [],
			});
		}
		isInternalUpdate.current = false;
	}, [resumeData]);

	const handleSave = () => {
		if (!resumeData) return;

		setSaveStatus('saving');
		isInternalUpdate.current = true;

		// Construct the updated resume
		const updatedResume = {
			...resumeData,
			data: {
				...resumeData.data,
				name: formData.basicInfo.name,
				title: formData.basicInfo.title,
				summary: formData.basicInfo.summary,
				contactInformation: formData.contactInfo,
				education: formData.educationIds,
				workExperience: formData.workExperience,
				skills: formData.skills,
				projects: formData.projects,
			},
		};

		updateResumeData(updatedResume as any);

		setSaveStatus('saved');
		setTimeout(() => setSaveStatus('idle'), 2000);
	};

	return (
		<div className="form-editor h-full bg-[#1e1e1e] overflow-auto p-4">
			<div className="space-y-4">
				<div className="flex justify-end mb-4">
					<Button
						onClick={handleSave}
						size="sm"
						disabled={saveStatus === 'saving'}
					>
						<Save className="mr-2 h-4 w-4" />
						{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
					</Button>
				</div>

				<BasicInfoSection
					data={formData.basicInfo}
					onChange={(data) => setFormData({ ...formData, basicInfo: data })}
				/>

				<ContactInfoSection
					data={formData.contactInfo}
					onChange={(data) => setFormData({ ...formData, contactInfo: data })}
				/>

				<EducationSection
					selectedIds={formData.educationIds}
					onChange={(ids) => setFormData({ ...formData, educationIds: ids })}
				/>

				<WorkExperienceSection
					jobs={formData.workExperience}
					onChange={(jobs) => setFormData({ ...formData, workExperience: jobs })}
				/>

				<SkillsSection
					skills={formData.skills}
					onChange={(skills) => setFormData({ ...formData, skills })}
				/>

				<ProjectsSection
					projects={formData.projects}
					onChange={(projects) => setFormData({ ...formData, projects })}
				/>
			</div>
		</div>
	);
};
