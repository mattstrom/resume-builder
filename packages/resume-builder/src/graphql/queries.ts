import { gql } from '@apollo/client';

const contactInformationFragment = gql`
	fragment ContactInformation on ContactInformation {
		location
		email
		phoneNumber
		githubProfile
		linkedInProfile
		personalWebsite
	}
`;

const contactInformationSubdocFragment = gql`
	fragment ContactInformationSubdoc on ContactInformationSubdoc {
		location
		email
		phoneNumber
		githubProfile
		linkedInProfile
		personalWebsite
	}
`;

const educationFragment = gql`
	fragment Education on Education {
		institution
		degree
		field
		graduated
	}
`;

const jobFragment = gql`
	fragment Job on Job {
		position
		company
		location
		startDate
		endDate
		responsibilities
		relevance
	}
`;

const projectFragment = gql`
	fragment Project on Project {
		name
		technologies
		items
		type
		relevance
	}
`;

const skillFragment = gql`
	fragment Skill on Skill {
		name
		category
		relevance
	}
`;

const skillGroupFragment = gql`
	fragment SkillGroup on SkillGroup {
		name
		items
	}
`;

const volunteeringFragment = gql`
	fragment Volunteering on Volunteering {
		organization
		position
		location
		startDate
		endDate
		responsibilities
		relevance
	}
`;

export const resumeContentFragment = gql`
	fragment ResumeContent on ResumeContent {
		name
		title
		summary
		contactInformation {
			...ContactInformationSubdoc
		}
		workExperience {
			...Job
		}
		education {
			...Education
		}
		skills {
			...Skill
		}
		skillGroups {
			...SkillGroup
		}
		projects {
			...Project
		}
		volunteering {
			...Volunteering
		}
	}

	${contactInformationSubdocFragment}
	${educationFragment}
	${jobFragment}
	${projectFragment}
	${skillFragment}
	${skillGroupFragment}
	${volunteeringFragment}
`;

export const applicationFragment = gql`
	fragment ApplicationFields on Application {
		_id
		name
		company
		jobPostingUrl
		jobDescription
		notionId
		resumeId
		coverLetterId
		notes
		createdAt
		updatedAt
		jobSummary {
			requiredSkills
			preferredSkills
			requiredEducation
			requiredExperience
			roleLevel
			locationPolicy
			compensationRange
			companyStage
			teamSize
			techStack
		}
		analysis {
			skillRelevance
			experienceRelevance
			overallFit
			strengths
			weaknesses
			recommendations
		}
	}
`;

export const LIST_APPLICATIONS = gql`
	query ListApplications {
		listApplications {
			...ApplicationFields
		}
	}

	${applicationFragment}
`;

export const GET_APPLICATION = gql`
	query GetApplication($id: String!) {
		getApplication(id: $id) {
			...ApplicationFields
		}
	}

	${applicationFragment}
`;

export const LIST_RESUMES = gql`
	query ListResumes($sort: ResumeSortInput, $filter: ResumeFilterInput) {
		listResumes(sort: $sort, filter: $filter) {
			_id
			id
			name
			company
			level
			base
			jobPostingUrl
			createdAt
			updatedAt
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const GET_RESUME = gql`
	query GetResume($id: String!) {
		getResume(id: $id) {
			_id
			id
			name
			company
			jobPostingUrl
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const LIST_EDUCATIONS = gql`
	query ListEducations {
		listEducations {
			_id
			institution
			degree
			field
			graduated
		}
	}
`;

export const LIST_JOBS = gql`
	query ListJobs {
		listJobs {
			_id
			company
			position
			location
			startDate
			endDate
			responsibilities
			relevance
		}
	}
`;
