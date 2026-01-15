import { outdent } from 'outdent';
import type { Resume } from '@resume-builder/entities';

export const resume: Resume = {
	_id: 'RES-4',
	id: 'RES-4',
	name: 'Resume',
	data: {
		name: 'Alex Johnson',
		title: 'Principal Software Engineer',
		contactInformation: {
			location: 'Anytown, USA',
			phoneNumber: '(555) 123-4567',
			email: 'alex.johnson@example.com',
			linkedInProfile: 'https://linkedin.com/in/alexjohnson',
			githubProfile: 'https://github.com/alexjohnson',
			personalWebsite: 'https://alexjohnson.dev',
		},
		summary: outdent`
		Principal Software Engineer with 15+ years of full-stack experience and deep specialization in Electron and 
		cross-platform desktop applications. Built real-time collaboration systems using CRDTs, AI-integrated visual 
		editors, and complex React/TypeScript UIs. Capable generalist adept in greenfield projects, end-to-end architecture, 
		Node.js services, AWS infrastructure, and CI/CD automation.
	`,
		workExperience: [
			{
				company: 'Acme Corp (formerly Beta Labs)',
				position: 'Principal Software Engineer, Applications',
				location: 'Anytown, USA',
				startDate: 'March 2019',
				endDate: 'December 2025',
				responsibilities: [
					'Led development of greenfield desktop application for building web applications with modern/n experimentation',
					'Built full-stack web application with React, TypeScript, Node.js, GraphQL, and PostgreSQL',
					'Integrated AI chatbot for AI-powered content suggestions',
					'Architected real-time collaboration system using CRDTs over WebSockets',
					'Designed and managed AWS infrastructure (Lambda, ECS, RDS, DynamoDB, CloudFront, API Gateway)',
					'Mentored junior engineers and established code review practices',
					'Designed CI/CD pipelines on GitHub Actions with automated code review with AI agents',
				],
			},
			{
				company: 'Beta Labs',
				position: 'Staff Software Engineer, Frontend',
				location: 'Anytown, USA',
				startDate: 'July 2016',
				endDate: 'March 2019',
				responsibilities: [
					'Built and maintained AI-enabled embedded web application and SDK for online retail',
					'Spearheaded adoption of containerized development environments and production deployed stack',
					'Migrated legacy codebase from AngularJS to Angular and TypeScript',
					'Lead full stack engineer on two proof-of-concept teams. Built products fully from concept to deliverable',
				],
			},
			{
				company: 'Gamma Studios',
				position: 'Software Engineer, Frontend',
				location: 'Anytown, USA',
				startDate: 'July 2014',
				endDate: 'July 2016',
				responsibilities: [
					'Architected and developed sophisticated web application for content management',
					'Refactored large portions of original codebase into testable, modularized code to reduce technical debt',
					'Contributed to Xamarin-based macOS application',
				],
			},
		],
		education: [
			{
				degree: 'Bachelor of Science',
				field: 'Computer Science',
				institution: 'State University',
				graduated: 'May 2010',
			},
		],
		skillGroups: [
			{
				name: 'Languages',
				items: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C#'],
			},
			{
				name: 'Frontend',
				items: [
					'React',
					'Electron',
					'RxJS',
					'Mobx',
					'D3.js',
					'Webpack',
					'Vite',
				],
			},
			{
				name: 'Backend',
				items: [
					'Node.js',
					'NestJS',
					'GraphQL',
					'WebSockets',
					'BullMQ',
					'Deno',
				],
			},
			{
				name: 'Databases',
				items: [
					'PostgreSQL',
					'MongoDB',
					'Redis',
					'DynamoDB',
					'MySQL',
					'SQL Server',
				],
			},
			{
				name: 'Infrastructure',
				items: [
					'AWS',
					'GitHub Actions',
					'CI/CD',
					'Docker',
					'Serverless',
					'Kubernetes',
					'Ansible',
					'Helm',
				],
			},
		],
		projects: [
			{
				name: 'Task Management App',
				technologies: [
					'Electron',
					'React',
					'TypeScript',
					'Mobx',
					'Webpack',
					'Vite',
				],
				items: [
					'Led development of desktop app for website management and feature flag management',
					'Integrated AI chatbot for AI-powered content suggestions',
					'Implemented cross-platform distribution and packaging',
					'Resolved complex bundling challenges across desktop app packaging tools',
				],
			},
			{
				name: 'E-commerce Platform',
				technologies: [
					'React',
					'Node.js',
					'GraphQL',
					'Mobx',
					'RxJS',
					'NestJS',
					'PostgreSQL',
				],
				items: [
					'Architected and built full-stack web application for managing website marketing campaigns',
					'Developed complex state management with Mobx and RxJS for responsive UI',
					'Designed GraphQL API with NestJS and PostgreSQL backend for efficient data retrieval and manipulation',
					'Implemented user authentication with OAuth and JWT, role-based access control, and audit logging',
					'Engineered advanced attribute-based authorization system after discovering security vulnerabilities',
					'Instrumented Node.js backend with AWS X-Ray and Sentry for distributed tracing and metrics',
					'Built advanced data visualization components using D3.js',
				],
			},
			{
				name: 'Real-time Chat System',
				technologies: [
					'CRDT',
					'WebSockets',
					'Redis',
					'Node.js',
					'YJS',
					'Mobx',
				],
				items: [
					'Architected multi-user collaborative editing system using Conflict-free Replicated Data Types (CRDTs)',
					'Developed custom synchronization layer between state management and CRDT engine',
					'Implemented conflict resolution, presence awareness, and reconnection recovery',
				],
			},
			{
				name: 'Job Queue Service',
				technologies: ['Node.js', 'BullMQ', 'Redis'],
				items: [
					'Architected distributed job queue for handling asynchronous tasks at scale',
					'Instrumented distributed tracing and monitoring for observability',
				],
			},
			{
				name: 'CI/CD Pipeline',
				technologies: ['GitHub Actions', 'Probot', 'Claude Code'],
				items: [
					'Architected CI/CD pipelines for automated testing, building, and deployment',
					'Implemented Probot server for automating GitHub workflows and PR management',
					'Integrated AI agents for automated code review and remote development',
					'Developed internal CLI tool and Slack app for release and deployment management',
				],
			},
			{
				name: 'serverless-dev-tools',
				technologies: [
					'Serverless',
					'Node.js',
					'CloudFront edge computing',
				],
				items: [
					'Open-source library for local development of CloudFront edge computing functions',
					'Eliminates deploy-test cycle for edge computing development',
				],
			},
			{
				name: 'Component Library',
				technologies: ['Vanilla JS', 'NextJS', 'WordPress', 'Drupal'],
				items: [
					'Built SDK enabling customers to embed experimentation capabilities into websites and backend applications',
					'Created framework-specific plugins and vanilla JS library for broad compatibility',
				],
			},
		],
	},
};
