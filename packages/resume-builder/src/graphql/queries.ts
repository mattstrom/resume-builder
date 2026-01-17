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
	}
`;

const projectFragment = gql`
	fragment Project on Project {
		name
		technologies
		items
	}
`;

const skillFragment = gql`
	fragment Skill on Skill {
		name
		category
	}
`;

const skillGroupFragment = gql`
	fragment SkillGroup on SkillGroup {
		name
		items
	}
`;

const resumeContentFragment = gql`
	fragment ResumeContent on ResumeContent {
		name
		title
		summary
		contactInformation {
			...ContactInformation
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
	}

	${contactInformationFragment}
	${educationFragment}
	${jobFragment}
	${projectFragment}
	${skillFragment}
	${skillGroupFragment}
`;

export const LIST_RESUMES = gql`
	query ListResumes {
		listResumes {
			_id
			id
			name
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
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;
