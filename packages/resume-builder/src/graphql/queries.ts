import { gql } from '@apollo/client';

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
	fragment ResumeJobFields on ResumeJob {
		position
		company
		location
		startDate
		endDate
		sourceId
		responsibilities {
			_id
			text
			bulletId
		}
		relevance
	}
`;

const projectFragment = gql`
	fragment ResumeProjectFields on ResumeProject {
		name
		description
		technologies
		sourceId
		items {
			_id
			text
			bulletId
		}
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
	fragment ResumeVolunteeringFields on ResumeVolunteering {
		organization
		position
		location
		startDate
		endDate
		sourceId
		responsibilities {
			_id
			text
			bulletId
		}
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
			...ResumeJobFields
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
			...ResumeProjectFields
		}
		volunteering {
			...ResumeVolunteeringFields
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
		coverLetterId
		notes
		createdAt
		updatedAt
		resumes {
			_id
			name
			updatedAt
		}
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
			roleLevelFit
			locationFit
			compensationFit
			companyFit
			logisticalFit
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
			applicationId
			jobPostingUrl
			createdAt
			updatedAt
			xml
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const LIST_BASE_RESUMES = gql`
	query ListBaseResumes {
		listResumes(filter: { base: true }) {
			_id
			name
			base
		}
	}
`;

export const GET_RESUME = gql`
	query GetResume($id: String!) {
		getResume(id: $id) {
			_id
			id
			name
			company
			jobPostingUrl
			xml
			data {
				...ResumeContent
			}
		}
	}

	${resumeContentFragment}
`;

export const GET_CONTACT_INFORMATION = gql`
	query GetContactInformation {
		listContactInformations {
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

export const LIST_PROJECTS = gql`
	query ListProjects {
		listProjects {
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

export const LIST_SKILLS = gql`
	query ListSkills {
		listSkills {
			_id
			name
			category
			relevance
		}
	}
`;

export const LIST_VOLUNTEERING = gql`
	query ListVolunteering {
		listVolunteering {
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

export const LIST_FACTS = gql`
	query ListFacts {
		facts {
			id
			uid
			what
			impact
			scale
			citation
			citationNodeIndex
			concepts {
				factId
				conceptId
				relation
				source
				confidence
				concept {
					id
					vocabulary
					key
					label
					definition
					externalUri
				}
			}
			createdAt
		}
	}
`;

export const LIST_CONCEPT_SUGGESTIONS = gql`
	query ListConceptSuggestions($vocabulary: String!, $search: String, $limit: Int) {
		conceptSuggestions(vocabulary: $vocabulary, search: $search, limit: $limit) {
			vocabulary
			key
			label
			definition
		}
	}
`;

export const SEARCH_CONCEPTS = gql`
	query SearchConcepts($query: String!, $vocabulary: String, $limit: Int, $minimumScore: Float) {
		searchConcepts(
			query: $query
			vocabulary: $vocabulary
			limit: $limit
			minimumScore: $minimumScore
		) {
			score
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

const bulletFields = gql`
	fragment BulletFields on Bullet {
		id
		uid
		text
		sourceType
		sourceId
		status
		position
		concepts {
			bulletId
			conceptId
			relation
			source
			confidence
			concept {
				id
				vocabulary
				key
				label
				definition
				externalUri
			}
		}
		contextScore
		contextNote
		contextWhatWorksWell
		contextWhyItMatters
		contextProposedEnhancements
		actionScore
		actionNote
		actionWhatWorksWell
		actionWhyItMatters
		actionProposedEnhancements
		outcomeScore
		outcomeNote
		outcomeWhatWorksWell
		outcomeWhyItMatters
		outcomeProposedEnhancements
		clarityScore
		clarityNote
		clarityWhatWorksWell
		clarityWhyItMatters
		clarityProposedEnhancements
		createdAt
		updatedAt
	}
`;

export const LIST_BULLETS = gql`
	query ListBullets($filter: BulletFilterInput) {
		bullets(filter: $filter) {
			...BulletFields
		}
	}

	${bulletFields}
`;

export const SEARCH_BULLETS = gql`
	query SearchBullets(
		$query: String!
		$filter: BulletFilterInput
		$limit: Int
		$minimumScore: Float
	) {
		searchBullets(query: $query, filter: $filter, limit: $limit, minimumScore: $minimumScore) {
			score
			bullet {
				...BulletFields
			}
		}
	}

	${bulletFields}
`;
