export interface StatementCheckpoint {
	key: string;
	label: string;
	description: string;
	met: boolean;
}

function contains(text: string, pattern: RegExp): boolean {
	return pattern.test(text);
}

export function evaluateProfessionalStatement(
	text: string,
): StatementCheckpoint[] {
	const normalized = text.trim();

	return [
		{
			key: 'identity',
			label: 'Who you are',
			description: 'Name a clear role, title, or professional identity.',
			met: contains(
				normalized,
				/\b(engineer|developer|designer|manager|leader|architect|analyst|consultant|specialist|director|researcher|writer|marketer|operator|founder)\b/i,
			),
		},
		{
			key: 'foundation',
			label: 'Your foundation',
			description:
				'Ground the statement in experience, education, or domain background.',
			met: contains(
				normalized,
				/\b(\d+\+?\s+years?|experience|background|career|degree|trained|specializing)\b/i,
			),
		},
		{
			key: 'capabilities',
			label: 'What you do',
			description:
				'Describe the capabilities you repeatedly bring to the work.',
			met: contains(
				normalized,
				/\b(build|building|lead|leading|design|designing|create|creating|deliver|delivering|scale|scaling|develop|developing|launch|launching|transform|transforming)\b/i,
			),
		},
		{
			key: 'impact',
			label: 'Your impact',
			description:
				'Include a measurable result, meaningful outcome, or clear scope.',
			met: contains(
				normalized,
				/(?:\b\d+[+%x]?\b|\$\d|\b(increased|reduced|improved|grew|saved|accelerated|revenue|customers|users|teams?|enterprise|at scale)\b)/i,
			),
		},
		{
			key: 'direction',
			label: 'Your why',
			description:
				'Share what motivates you or the direction you want to pursue.',
			met: contains(
				normalized,
				/\b(motivated|driven|passionate|focused|committed|care about|believe|mission|purpose|energized|aim|aspire)\b/i,
			),
		},
		{
			key: 'authenticity',
			label: 'Authenticity',
			description:
				'Use a personal point of view or language that shows what you value.',
			met: contains(
				normalized,
				/\b(I|I'm|I’m|my|me|motivated|driven|care|believe|value|enjoy)\b/i,
			),
		},
	];
}
