import { gql } from '@apollo/client';

import { applicationFragment, resumeContentFragment } from './queries.ts';

export const UPSERT_CONTACT_INFORMATION = gql`
	mutation UpsertContactInformation($input: ContactInformationInput!) {
		upsertContactInformation(input: $input) {
			_id
			location
			email
			phoneNumber
			linkedInProfile
			githubProfile
			personalWebsite
		}
	}
`;

export const CREATE_EDUCATION = gql`
	mutation CreateEducation($education: EducationInput!) {
		createEducation(education: $education) {
			_id
			institution
			degree
			field
			graduated
		}
	}
`;

export const UPDATE_EDUCATION = gql`
	mutation UpdateEducation($id: String!, $education: EducationInput!) {
		updateEducation(id: $id, education: $education) {
			_id
			institution
			degree
			field
			graduated
		}
	}
`;

export const DELETE_EDUCATION = gql`
	mutation DeleteEducation($id: String!) {
		deleteEducation(id: $id)
	}
`;

export const CREATE_JOB = gql`
	mutation CreateJob($job: JobInput!) {
		createJob(job: $job) {
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

export const UPDATE_JOB = gql`
	mutation UpdateJob($id: String!, $job: JobInput!) {
		updateJob(id: $id, job: $job) {
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

export const DELETE_JOB = gql`
	mutation DeleteJob($id: String!) {
		deleteJob(id: $id)
	}
`;

export const CREATE_PROJECT = gql`
	mutation CreateProject($project: ProjectInput!) {
		createProject(project: $project) {
			_id
			name
			technologies
			items
			type
			relevance
		}
	}
`;

export const UPDATE_PROJECT = gql`
	mutation UpdateProject($id: String!, $project: ProjectInput!) {
		updateProject(id: $id, project: $project) {
			_id
			name
			technologies
			items
			type
			relevance
		}
	}
`;

export const DELETE_PROJECT = gql`
	mutation DeleteProject($id: String!) {
		deleteProject(id: $id)
	}
`;

export const CREATE_SKILL = gql`
	mutation CreateSkill($skill: SkillInput!) {
		createSkill(skill: $skill) {
			_id
			name
			category
			relevance
		}
	}
`;

export const UPDATE_SKILL = gql`
	mutation UpdateSkill($id: String!, $skill: SkillInput!) {
		updateSkill(id: $id, skill: $skill) {
			_id
			name
			category
			relevance
		}
	}
`;

export const DELETE_SKILL = gql`
	mutation DeleteSkill($id: String!) {
		deleteSkill(id: $id)
	}
`;

export const CREATE_VOLUNTEERING = gql`
	mutation CreateVolunteering($volunteering: VolunteeringInput!) {
		createVolunteering(volunteering: $volunteering) {
			_id
			organization
			position
			location
			startDate
			endDate
			responsibilities
			relevance
		}
	}
`;

export const UPDATE_VOLUNTEERING = gql`
	mutation UpdateVolunteering($id: String!, $volunteering: VolunteeringInput!) {
		updateVolunteering(id: $id, volunteering: $volunteering) {
			_id
			organization
			position
			location
			startDate
			endDate
			responsibilities
			relevance
		}
	}
`;

export const DELETE_VOLUNTEERING = gql`
	mutation DeleteVolunteering($id: String!) {
		deleteVolunteering(id: $id)
	}
`;

export const CREATE_APPLICATION = gql`
	mutation CreateApplication($applicationData: ApplicationInput!) {
		createApplication(applicationData: $applicationData) {
			...ApplicationFields
		}
	}

	${applicationFragment}
`;

export const UPDATE_APPLICATION = gql`
	mutation UpdateApplication($id: String!, $applicationData: ApplicationUpdateInput!) {
		updateApplication(id: $id, applicationData: $applicationData) {
			...ApplicationFields
		}
	}

	${applicationFragment}
`;

export const CREATE_RESUME = gql`
	mutation CreateResume($resumeData: ResumeCreateInput!) {
		createResume(resumeData: $resumeData) {
			_id
			id
			name
			data {
				basics {
					name
					label
					image
					email
					phone
					url
					summary
					location {
						address
						postalCode
						city
						countryCode
						region
					}
					profiles {
						network
						username
						url
					}
				}
				work {
					name
					position
					url
					startDate
					endDate
					summary
					highlights
				}
				volunteer {
					organization
					position
					url
					startDate
					endDate
					summary
					highlights
				}
				education {
					institution
					url
					area
					studyType
					startDate
					endDate
					score
					courses
				}
				awards {
					title
					date
					awarder
					summary
				}
				certificates {
					name
					date
					issuer
					url
				}
				publications {
					name
					publisher
					releaseDate
					url
					summary
				}
				skills {
					name
					level
					keywords
				}
				languages {
					language
					fluency
				}
				interests {
					name
					keywords
				}
				references {
					name
					reference
				}
				projects {
					name
					startDate
					endDate
					description
					highlights
					url
				}
			}
		}
	}
`;

export const CREATE_BLANK_RESUME = gql`
	mutation CreateBlankResume($resumeData: BlankResumeCreateInput!) {
		createBlankResume(resumeData: $resumeData) {
			_id
			id
			name
			company
			level
			jobPostingUrl
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const UPDATE_RESUME = gql`
	mutation UpdateResume($id: String!, $resumeData: ResumeUpdateInput!) {
		updateResume(id: $id, resumeData: $resumeData) {
			_id
			id
			name
			data {
				basics {
					name
					label
					image
					email
					phone
					url
					summary
					location {
						address
						postalCode
						city
						countryCode
						region
					}
					profiles {
						network
						username
						url
					}
				}
				work {
					name
					position
					url
					startDate
					endDate
					summary
					highlights
				}
				volunteer {
					organization
					position
					url
					startDate
					endDate
					summary
					highlights
				}
				education {
					institution
					url
					area
					studyType
					startDate
					endDate
					score
					courses
				}
				awards {
					title
					date
					awarder
					summary
				}
				certificates {
					name
					date
					issuer
					url
				}
				publications {
					name
					publisher
					releaseDate
					url
					summary
				}
				skills {
					name
					level
					keywords
				}
				languages {
					language
					fluency
				}
				interests {
					name
					keywords
				}
				references {
					name
					reference
				}
				projects {
					name
					startDate
					endDate
					description
					highlights
					url
				}
			}
		}
	}
`;

export const SET_RESUME_FIELD = gql`
	mutation SetResumeField($id: String!, $input: ResumeSetFieldInput!, $value: JSON!) {
		setResumeField(id: $id, input: $input, value: $value) {
			_id
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const ADD_RESUME_COLLECTION_ITEM = gql`
	mutation AddResumeCollectionItem($id: String!, $input: ResumeAddCollectionItemInput!) {
		addResumeCollectionItem(id: $id, input: $input) {
			_id
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const REMOVE_RESUME_COLLECTION_ITEM = gql`
	mutation RemoveResumeCollectionItem($id: String!, $input: ResumeRemoveCollectionItemInput!) {
		removeResumeCollectionItem(id: $id, input: $input) {
			_id
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;
