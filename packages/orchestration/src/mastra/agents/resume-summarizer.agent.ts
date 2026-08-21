import { Agent } from '@mastra/core/agent';
import { outdent } from 'outdent';

import config from '@/config';

export const resumeSummarizerAgent = new Agent({
	id: 'resume-summarizer-agent',
	name: 'Resume Summarizer',
	model: config.llms.defaultModel,
	instructions: outdent`
		Summarize a single resume for semantic retrieval. The result will be used
		to find resumes and bullets with similar content, not shown directly to an
		employer. Base every field only on the supplied resume. Prefer concise,
		normalized phrases that work well as search terms.

		- dominantTheme: the primary engineering or professional orientation, such as
		  frontend, backend, full-stack/generalist, platform, data, product, or design.
		- summaryTheme: what the resume's professional summary emphasizes.
		- projects: every substantial named project, each with a one-sentence description
		  of its purpose and distinctive work. Do not include ordinary employers unless
		  the resume presents the work as a project.
		- technologies: deduplicated technologies and technical practices central to the
		  resume, using their conventional names.
		- contentThemes: high-level recurring work and impact themes useful for finding
		  similar bullets, such as performance optimization, developer tooling,
		  distributed systems, accessibility, mentoring, or cost reduction.
	`,
});
