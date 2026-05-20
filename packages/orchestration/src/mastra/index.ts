import { chatRoute } from '@mastra/ai-sdk';
import { StaticRBACProvider, DEFAULT_ROLES } from '@mastra/core/auth/ee';
import { Mastra } from '@mastra/core/mastra';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { PinoLogger } from '@mastra/loggers';
import {
	CloudExporter,
	DefaultExporter,
	Observability,
	SensitiveDataFilter,
} from '@mastra/observability';
import { PostgresStore } from '@mastra/pg';
import { getAuthenticatedUser } from '@mastra/server/auth';

import { applicationReviewerAgent } from './agents/application-reviewer.agent';
import { careerAdvisorAgent } from './agents/career-advisor.agent';
import { chatAgent } from './agents/chat.agent';
import { fitAssessmentAgent } from './agents/fit-assessment.agent';
import { interviewCoachAgent } from './agents/interview-coach.agent';
import { narrativeCoachAgent } from './agents/narrative-coach.agent';
import { resumeWriterAgent } from './agents/resume-writer.agent';
import { weatherAgent } from './agents/weather-agent';
import { webAgent } from './agents/web-agent';
import { Auth0JwtProvider, type Auth0JwtUser } from './auth';
import {
	completenessScorer,
	toolCallAppropriatenessScorer,
	translationScorer,
} from './scorers/weather-scorer';
import { fitAssessmentWorkflow } from './workflows/fit-assessment.workflow';
import { handoffWorkflow } from './workflows/handoff.workflow';
import { weatherWorkflow } from './workflows/weather-workflow';

const auth0Provider = new Auth0JwtProvider({
	domain: 'login.mattstrom.com',
	audience: 'https://resume-builder.mattstrom.com',
	clientId: process.env['AUTH0_CLIENT_ID']!,
});

const rbacProvider = new StaticRBACProvider<Auth0JwtUser>({
	roles: DEFAULT_ROLES,
	getUserRoles: (user) => (user.permissions?.includes('studio:admin') ? ['admin'] : ['member']),
});

const directory = './workspace';

const workspace = new Workspace({
	filesystem: new LocalFilesystem({
		basePath: directory,
	}),
	sandbox: new LocalSandbox({
		workingDirectory: directory,
	}),
	skills: ['skills'],
});

export const mastra = new Mastra({
	// workspace,
	server: {
		auth: auth0Provider,
		rbac: rbacProvider,
		apiRoutes: [
			chatRoute({
				path: '/chat/:agentId',
			}),
		],
		middleware: [
			async (context, next) => {
				const requestContext = context.get('requestContext');
				const authHeader = context.req.header('Authorization');

				if (authHeader) {
					const user = await getAuthenticatedUser<Auth0JwtUser>({
						mastra: context.get('mastra'),
						token: authHeader,
						request: context.req.raw,
					});

					if (user?.sub) {
						requestContext.set('userId', user.sub);
					}
				}

				await next();
			},
		],
	},
	bundler: {
		sourcemap: true,
		externals: ['@duckdb/node-bindings', '@resume-builder/entities', 'electron'],
	},
	workflows: { handoffWorkflow, weatherWorkflow, fitAssessmentWorkflow },
	agents: {
		applicationReviewer: applicationReviewerAgent,
		careerAdvisor: careerAdvisorAgent,
		chatAgent,
		fitAssessmentAgent,
		interviewCoach: interviewCoachAgent,
		narrativeCoach: narrativeCoachAgent,
		resumeWriter: resumeWriterAgent,
		weatherAgent,
		webAgent,
	},
	editor: new MastraEditor(),
	scorers: {
		toolCallAppropriatenessScorer,
		completenessScorer,
		translationScorer,
	},
	storage: new MastraCompositeStore({
		id: 'composite-storage',
		default: new PostgresStore({
			id: 'mastra-storage',
			host: 'localhost',
			user: 'postgres',
			password: 'postgres',
			database: 'mastra',
		}),
		domains: {
			observability: await new DuckDBStore().getStore('observability'),
		},
	}),
	logger: new PinoLogger({
		name: 'Mastra',
		level: 'info',
	}),
	observability: new Observability({
		configs: {
			default: {
				serviceName: 'mastra',
				exporters: [
					new DefaultExporter(), // Persists traces to storage for Mastra Studio
					new CloudExporter(), // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
				],
				spanOutputProcessors: [
					new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
				],
			},
		},
	}),
});
