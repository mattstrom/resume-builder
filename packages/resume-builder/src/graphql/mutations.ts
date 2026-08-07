import { gql } from '@apollo/client';

import { applicationFragment, resumeContentFragment } from './queries.ts';

export const UPSERT_FACT_CONCEPT = gql`
	mutation UpsertFactConcept($factId: ID!, $meaning: FactMeaningInput!) {
		upsertFactConcept(factId: $factId, meaning: $meaning) {
			factId
			conceptId
			relation
			source
			confidence
			qualifier {
				dimension
				operator
				value
				min
				max
				unit
			}
			concept {
				id
				vocabulary
				key
				label
				definition
				externalUri
			}
		}
	}
`;

export const DELETE_FACT_CONCEPT = gql`
	mutation DeleteFactConcept($factId: ID!, $conceptId: ID!, $relation: String!) {
		deleteFactConcept(factId: $factId, conceptId: $conceptId, relation: $relation)
	}
`;

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
			description
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
			description
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

export const CREATE_BULLET = gql`
	mutation CreateBullet($input: CreateBulletInput!) {
		createBullet(input: $input) {
			id
		}
	}
`;

export const UPDATE_BULLET = gql`
	mutation UpdateBullet($id: ID!, $input: UpdateBulletInput!) {
		updateBullet(id: $id, input: $input) {
			id
		}
	}
`;

export const SET_BULLET_STATUS = gql`
	mutation SetBulletStatus($id: ID!, $status: BulletStatus!) {
		setBulletStatus(id: $id, status: $status) {
			id
			status
		}
	}
`;

export const REORDER_BULLETS = gql`
	mutation ReorderBullets($id: ID!, $targetId: ID!) {
		reorderBullets(id: $id, targetId: $targetId) {
			id
			position
		}
	}
`;

export const UPSERT_BULLET_CONCEPT = gql`
	mutation UpsertBulletConcept($bulletId: ID!, $meaning: BulletMeaningInput!) {
		upsertBulletConcept(bulletId: $bulletId, meaning: $meaning) {
			bulletId
			conceptId
			relation
			source
			confidence
			qualifier {
				dimension
				operator
				value
				min
				max
				unit
			}
			concept {
				id
				vocabulary
				key
				label
				definition
				externalUri
			}
		}
	}
`;

export const DELETE_BULLET_CONCEPT = gql`
	mutation DeleteBulletConcept($bulletId: ID!, $conceptId: ID!, $relation: String!) {
		deleteBulletConcept(bulletId: $bulletId, conceptId: $conceptId, relation: $relation)
	}
`;

export const REPLACE_GENERATED_BULLET_CONCEPTS = gql`
	mutation ReplaceGeneratedBulletConcepts(
		$bulletId: ID!
		$expectedText: String!
		$meanings: [BulletMeaningInput!]!
	) {
		replaceGeneratedBulletConcepts(
			bulletId: $bulletId
			expectedText: $expectedText
			meanings: $meanings
		) {
			bulletId
			conceptId
			relation
			source
			confidence
			qualifier {
				dimension
				operator
				value
				min
				max
				unit
			}
			concept {
				id
				vocabulary
				key
				label
				definition
				externalUri
			}
		}
	}
`;

export const CREATE_APPLICATION = gql`
	mutation CreateApplication($applicationData: ApplicationInput!, $sourceResumeId: String) {
		createApplication(applicationData: $applicationData, sourceResumeId: $sourceResumeId) {
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

export const CREATE_BLANK_RESUME = gql`
	mutation CreateBlankResume($resumeData: BlankResumeCreateInput!) {
		createBlankResume(resumeData: $resumeData) {
			_id
			id
			name
			company
			level
			jobPostingUrl
			xml
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const DELETE_RESUME = gql`
	mutation DeleteResume($id: String!) {
		deleteResume(id: $id)
	}
`;
