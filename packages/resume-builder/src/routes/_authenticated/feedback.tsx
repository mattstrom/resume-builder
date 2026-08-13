import { useMutation, useQuery } from '@apollo/client/react';
import { profileKnowledgeProposalSchema } from '@resume-builder/entities';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Check, Inbox, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AppShell } from '@/components/app-shell/AppShell.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { RESOLVE_PROFILE_KNOWLEDGE_PROPOSAL } from '@/graphql/mutations.ts';
import { GET_PROFILE_KNOWLEDGE_INBOX } from '@/graphql/queries.ts';
import type {
	GetProfileKnowledgeInboxData,
	ProfileKnowledgeInboxItem,
	ResolveProfileKnowledgeProposalData,
	ResolveProfileKnowledgeProposalVariables,
} from '@/graphql/types.ts';
import { useStore } from '@/stores/store.provider.tsx';

const kindLabels: Record<string, string> = {
	fact: 'Profile fact',
	'requirement-interpretation': 'Requirement guidance',
	'scoring-guidance': 'Scoring guidance',
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short',
});

function gradeLabel(grade?: string | null) {
	if (!grade) return 'Agent grade';
	return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function FeedbackInboxItem({
	item,
	resolving,
	onResolve,
}: {
	item: ProfileKnowledgeInboxItem;
	resolving: boolean;
	onResolve: (proposalId: string, accept: boolean) => Promise<void>;
}) {
	const parsed = profileKnowledgeProposalSchema.safeParse(item.proposal.payload);
	const proposedKnowledge = parsed.success
		? parsed.data.kind === 'fact'
			? parsed.data.fact?.what
			: parsed.data.guidance
		: undefined;
	const applicationLabel = item.applicationName || item.company || 'Untitled application';

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">
								{kindLabels[item.proposal.kind] ?? item.proposal.kind}
							</Badge>
							<span className="text-xs text-muted-foreground">
								{dateFormatter.format(new Date(item.proposal.createdAt))}
							</span>
						</div>
						<CardTitle>{item.proposal.title}</CardTitle>
						<CardDescription>
							{applicationLabel}
							{item.company && item.company !== applicationLabel
								? ` · ${item.company}`
								: ''}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Badge variant="outline">{gradeLabel(item.agentGrade)}</Badge>
						<ArrowRight className="text-muted-foreground" aria-hidden="true" />
						<Badge variant="outline">{gradeLabel(item.manualGrade)}</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Requirement
					</p>
					<p className="text-sm">{item.requirement}</p>
				</div>
				{item.explanation && (
					<div className="flex flex-col gap-1">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Your feedback
						</p>
						<p className="text-sm">{item.explanation}</p>
					</div>
				)}
				<Separator />
				<div className="flex flex-col gap-2">
					<p className="text-sm text-muted-foreground">{item.proposal.rationale}</p>
					{proposedKnowledge && <p className="font-medium">“{proposedKnowledge}”</p>}
				</div>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-between gap-3">
				<Button variant="ghost" asChild>
					<Link
						to="/applications/$applicationId"
						params={{ applicationId: item.applicationId }}
						search={{ stage: 'requirements' }}
					>
						View application
						<ArrowRight data-icon="inline-end" />
					</Link>
				</Button>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => void onResolve(item.proposal.id, false)}
						disabled={resolving}
					>
						<X data-icon="inline-start" />
						Dismiss
					</Button>
					<Button
						type="button"
						onClick={() => void onResolve(item.proposal.id, true)}
						disabled={resolving}
					>
						{resolving ? (
							<Spinner data-icon="inline-start" />
						) : (
							<Check data-icon="inline-start" />
						)}
						Accept
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

function FeedbackInboxPage() {
	const { factsStore } = useStore();
	const [resolvingProposalId, setResolvingProposalId] = useState<string>();
	const { data, loading, refetch } = useQuery<GetProfileKnowledgeInboxData>(
		GET_PROFILE_KNOWLEDGE_INBOX,
		{ fetchPolicy: 'cache-and-network' },
	);
	const [resolveProposal] = useMutation<
		ResolveProfileKnowledgeProposalData,
		ResolveProfileKnowledgeProposalVariables
	>(RESOLVE_PROFILE_KNOWLEDGE_PROPOSAL);
	const items = data?.profileKnowledgeInbox ?? [];

	useEffect(() => {
		document.title = 'Feedback inbox - Resume Builder';
		return () => {
			document.title = 'Resume Builder';
		};
	}, []);

	const handleResolve = async (proposalId: string, accept: boolean) => {
		setResolvingProposalId(proposalId);
		try {
			await resolveProposal({ variables: { proposalId, accept } });
			await Promise.all([refetch(), accept ? factsStore.refetch() : Promise.resolve()]);
			toast.success(accept ? 'Profile knowledge updated.' : 'Suggestion dismissed.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not resolve suggestion.');
		} finally {
			setResolvingProposalId(undefined);
		}
	};

	return (
		<div className="h-full overflow-y-auto bg-background">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 md:px-8">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Inbox aria-hidden="true" />
							<h1 className="text-2xl font-semibold tracking-tight">
								Feedback inbox
							</h1>
						</div>
						<p className="max-w-2xl text-sm text-muted-foreground">
							Review profile updates suggested by your requirement-grade corrections.
							Nothing changes until you accept a suggestion.
						</p>
					</div>
					<Badge variant="secondary">{items.length} pending</Badge>
				</header>

				{loading && items.length === 0 ? (
					<Card>
						<CardContent className="flex items-center gap-2 py-8">
							<Spinner />
							<span className="text-sm text-muted-foreground">Loading feedback…</span>
						</CardContent>
					</Card>
				) : items.length === 0 ? (
					<Alert>
						<Check />
						<AlertTitle>You're all caught up</AlertTitle>
						<AlertDescription>
							New profile suggestions from grade feedback will appear here.
						</AlertDescription>
					</Alert>
				) : (
					<div className="flex flex-col gap-4">
						{items.map((item) => (
							<FeedbackInboxItem
								key={item.proposal.id}
								item={item}
								resolving={resolvingProposalId === item.proposal.id}
								onResolve={handleResolve}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function FeedbackRouteComponent() {
	return (
		<AppShell>
			<FeedbackInboxPage />
		</AppShell>
	);
}

export const Route = createFileRoute('/_authenticated/feedback')({
	component: FeedbackRouteComponent,
});
