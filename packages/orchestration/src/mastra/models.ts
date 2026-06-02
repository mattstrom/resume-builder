import { createOpenAI } from '@ai-sdk/openai';

export const lmstudio = createOpenAI({
	baseURL: 'http://localhost:1234/v1',
	apiKey: 'lm-studio',
});
