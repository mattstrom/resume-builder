import { Mastra } from '@mastra/core/mastra';
import { MastraCompositeStore } from '@mastra/core/storage';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import {
	CloudExporter,
	DefaultExporter,
	Observability,
	SensitiveDataFilter,
} from '@mastra/observability';
import { fitAssessmentAgent } from './agents/fit-assessment.agent';
import { weatherAgent } from './agents/weather-agent';
import { webAgent } from './agents/web-agent';
import {
	completenessScorer,
	toolCallAppropriatenessScorer,
	translationScorer,
} from './scorers/weather-scorer';
import { fitAssessmentWorkflow } from './workflows/fit-assessment.workflow';
import { weatherWorkflow } from './workflows/weather-workflow';

export const mastra = new Mastra({
	bundler: {
		sourcemap: true,
		externals: ['@duckdb/node-bindings', '@resume-builder/entities'],
	},
	workflows: { weatherWorkflow, fitAssessmentWorkflow },
	agents: { weatherAgent, fitAssessmentAgent, webAgent },
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
