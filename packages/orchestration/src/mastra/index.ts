import { MastraAuthAuth0 } from '@mastra/auth-auth0';
import { Mastra } from '@mastra/core/mastra';
import { CompositeAuth, SimpleAuth } from '@mastra/core/server';
import { MastraCompositeStore } from '@mastra/core/storage';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { MCPServer } from '@mastra/mcp';
import {
	CloudExporter,
	DefaultExporter,
	Observability,
	SensitiveDataFilter,
} from '@mastra/observability';
import { applicationReviewerAgent } from './agents/application-reviewer.agent';
import { careerAdvisorAgent } from './agents/career-advisor.agent';
import { chatAgent } from './agents/chat.agent';
import { fitAssessmentAgent } from './agents/fit-assessment.agent';
import { interviewCoachAgent } from './agents/interview-coach.agent';
import { narrativeCoachAgent } from './agents/narrative-coach.agent';
import { resumeWriterAgent } from './agents/resume-writer.agent';
import { weatherAgent } from './agents/weather-agent';
import { webAgent } from './agents/web-agent';
import {
	completenessScorer,
	toolCallAppropriatenessScorer,
	translationScorer,
} from './scorers/weather-scorer';
import { fitAssessmentWorkflow } from './workflows/fit-assessment.workflow';
import { handoffWorkflow } from './workflows/handoff.workflow';
import { weatherWorkflow } from './workflows/weather-workflow';
import { chatRoute } from '@mastra/ai-sdk';

const simpleAuth = new SimpleAuth({
	tokens: {
		'my-api-key': {
			id: 'user-1',
			name: 'Alice',
			role: 'admin',
		},
		'sk-admin-token-123': {
			id: 'user-1',
			name: 'Admin User',
			role: 'admin',
		},
	},
});

const auth0Provider = new MastraAuthAuth0({
	domain: 'login.mattstrom.com',
	audience: 'https://resume-builder.mattstrom.com',
});

export const mastra = new Mastra({
	server: {
		auth: new CompositeAuth([simpleAuth, auth0Provider]),
		// auth: simpleAuth,
		apiRoutes: [
			chatRoute({
				path: '/chat/:agentId',
			}),
		],
		middleware: [
			async (context, next) => {
				const userId = context.req.header('X-User-Id');
				const requestContext = context.get('requestContext');

				requestContext.set('userId', userId);

				await next();
			},
		],
	},
	bundler: {
		sourcemap: true,
		externals: ['@duckdb/node-bindings', '@resume-builder/entities'],
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
		default: new LibSQLStore({
			id: 'mastra-storage',
			url: 'file:./mastra.db',
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
