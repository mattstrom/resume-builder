import { chatRoute } from '@mastra/ai-sdk';
import { StaticRBACProvider, DEFAULT_ROLES } from '@mastra/core/auth/ee';
import { Mastra } from '@mastra/core/mastra';
import {
	MASTRA_AUTH_TOKEN_KEY,
	MASTRA_RESOURCE_ID_KEY,
	MASTRA_THREAD_ID_KEY,
} from '@mastra/core/request-context';
import { MastraCompositeStore } from '@mastra/core/storage';
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

import config from '@/config';

import { configuration } from '../configuration';
import { applicationReviewerAgent } from './agents/application-reviewer.agent';
import { backgroundAutofillAgent } from './agents/background-autofill.agent';
import { careerAdvisorAgent } from './agents/career-advisor.agent';
import { chatAgent } from './agents/chat.agent';
import { factsExtractorAgent } from './agents/facts-extractor.agent';
import { fitAssessmentAgent } from './agents/fit-assessment.agent';
import { interviewCoachAgent } from './agents/interview-coach.agent';
import { jobRequirementsExtractorAgent } from './agents/job-requirements-extractor.agent';
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
import { markupJobDescriptionWorkflow } from './steps/markup-job-description.step';
import { backgroundAutofillWorkflow } from './workflows/background-autofill.workflow';
import { careerContextWorkflow } from './workflows/career-context.workflow';
import { comparisonWorkflow } from './workflows/comparison.workflow';
import { narrativeDistillationWorkflow } from './workflows/distillation/narrative-distillation.workflow';
import { factsExtractionWorkflow } from './workflows/facts-extraction.workflow';
import { fitAssessmentWorkflow } from './workflows/fit-assessment.workflow';
import { handoffWorkflow } from './workflows/handoff.workflow';
import { weatherWorkflow } from './workflows/weather-workflow';

console.log(`Configuration:\n${configuration}`);

const auth0Provider = new Auth0JwtProvider({
	domain: config.auth0.domain,
	audience: config.auth0.audience,
	clientId: config.auth0.clientId,
});

const rbacProvider = new StaticRBACProvider<Auth0JwtUser>({
	roles: DEFAULT_ROLES,
	getUserRoles: (user) => (user.permissions?.includes('studio:admin') ? ['admin'] : ['member']),
});

export const mastra = new Mastra({
	server: {
		auth: auth0Provider,
		rbac: rbacProvider,
		apiRoutes: [
			chatRoute({
				path: '/chat/:agentId',
			}),
		],
		cors: {
			allowHeaders: ['X-Thread-Id'],
		},
		middleware: [
			async (context, next) => {
				const requestContext = context.get('requestContext');
				const authHeader = requestContext.get('mastra__isStudio')
					? context.req.header('X-Authorization')
					: context.req.header('Authorization');

				if (requestContext.get('mastra__isStudio')) {
					requestContext.set(MASTRA_AUTH_TOKEN_KEY, authHeader!.replace('Bearer ', ''));
				}

				if (authHeader) {
					const user = await getAuthenticatedUser<Auth0JwtUser>({
						mastra: context.get('mastra'),
						token: authHeader,
						request: context.req.raw,
					});

					if (user?.sub) {
						requestContext.set('userId', user.sub);
						requestContext.set(MASTRA_RESOURCE_ID_KEY, user.sub);
					}
				}

				const threadId = context.req.header('x-thread-id');
				if (threadId) {
					requestContext.set(MASTRA_THREAD_ID_KEY, threadId);
				}

				await next();
			},
		],
	},
	bundler: {
		sourcemap: true,
		externals: [
			'@anush008/tokenizers',
			'@duckdb/node-bindings',
			'@resume-builder/entities',
			'electron',
		],
	},
	workflows: {
		handoffWorkflow,
		weatherWorkflow,
		fitAssessmentWorkflow,
		backgroundAutofillWorkflow,
		careerContextWorkflow,
		factsExtractionWorkflow,
		narrativeDistillationWorkflow,
		comparisonWorkflow,
		markupJobDescriptionWorkflow,
	},
	agents: {
		applicationReviewer: applicationReviewerAgent,
		backgroundAutofill: backgroundAutofillAgent,
		careerAdvisor: careerAdvisorAgent,
		chatAgent,
		factsExtractor: factsExtractorAgent,
		fitAssessmentAgent,
		interviewCoach: interviewCoachAgent,
		jobRequirementsExtractor: jobRequirementsExtractorAgent,
		narrativeCoach: narrativeCoachAgent,
		resumeWriter: resumeWriterAgent,
		weatherAgent,
		webAgent,
	},
	editor: new MastraEditor({
		builder: {
			enabled: true,
			configuration: {
				agent: {
					memory: { observationalMemory: true },
				},
			},
		},
	}),
	scorers: {
		toolCallAppropriatenessScorer,
		completenessScorer,
		translationScorer,
	},
	storage: new MastraCompositeStore({
		id: 'composite-storage',
		default: new PostgresStore({
			id: 'mastra-storage',
			host: config.postgres.host,
			user: config.postgres.user,
			password: config.postgres.password,
			database: config.postgres.database,
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
