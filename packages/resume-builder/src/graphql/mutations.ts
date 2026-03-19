import { gql } from '@apollo/client';

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
		}
	}
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
