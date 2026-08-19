import { MastraClient } from '@mastra/client-js';
import { chatWorkingMemorySchema, type ChatScope } from '@resume-builder/entities';
import { DefaultChatTransport } from 'ai';
import { action, computed, makeObservable, observable } from 'mobx';

import type { RootStore } from '@/stores/root.store.ts';
import { authFetch } from '@/utils/auth.ts';

interface ConversationPayload {
	id: string;
	title?: string;
	createdAt: string | Date;
	messages: {
		id: string;
		role: string;
		content: { parts?: { type: string; text?: string }[] };
	}[];
}

export interface ConversationSummary {
	id: string;
	title: string;
	updatedAt: string | Date;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	parts: { type: 'text'; text: string }[];
}

export class Conversation {
	public id!: string;
	public title!: string;
	public createdAt!: string;

	@observable
	messages: Message[] = [];

	constructor() {
		makeObservable(this);
	}

	static createFrom(payload: ConversationPayload): Conversation {
		const conversation = new Conversation();

		Object.assign(conversation, {
			id: payload.id,
			title: payload.title ?? 'New Conversation',
			createdAt: payload.createdAt,
		});

		payload.messages.forEach((message) => {
			if (message.role !== 'user' && message.role !== 'assistant') {
				return;
			}

			const content =
				message.content.parts
					?.filter((part) => part.type === 'text')
					.map((part) => part.text ?? '')
					.join('') ?? '';

			conversation.messages.push({
				id: message.id,
				role: message.role as 'user' | 'assistant',
				content,
				parts: [
					{
						type: 'text',
						text: content,
					},
				],
			});
		});

		return conversation;
	}
}

export class ConversationService {
	@observable
	conversations = new Map<string, Conversation>();

	@observable
	activeConversationId: string | null = null;

	@computed
	get activeConversation() {
		if (!this.activeConversationId) {
			return null;
		}

		return this.conversations.get(this.activeConversationId) ?? null;
	}

	@computed
	get requestContext() {
		const { selectedApplicationId } = this.rootStore.applicationStore;
		const { selectedPaths } = this.rootStore.inspectStore;

		return {
			applicationId: selectedApplicationId,
			highlightedPaths: Array.from(selectedPaths.keys()),
		};
	}

	get chatScope(): ChatScope | null {
		const p = this.rootStore.router?.state.location.pathname ?? '';
		if (p.includes('/profile/background')) {
			return 'background';
		}

		if (p.includes('/profile/preferences')) {
			return 'preferences';
		}

		if (p.includes('/profile')) {
			return 'narrative';
		}

		return null;
	}

	// JSON string for chatAgent's structured working memory, validated against
	// the shared `chatWorkingMemorySchema`.
	private buildInitialWorkingMemory(): string | null {
		const applicationId = this.rootStore.applicationStore.selectedApplicationId;
		const resumeId = this.rootStore.resumeStore.selectedResumeId;

		if (!applicationId && !resumeId) {
			return null; // nothing known yet; let the agent fill it in
		}

		const workingMemory = chatWorkingMemorySchema.parse({
			applicationId,
			resumeId,
			facts: [],
		});

		return JSON.stringify(workingMemory);
	}

	private getActiveStorageKey(): string | null {
		const scope = this.chatScope;
		if (scope) {
			return `chat:lastConversation:scope:${scope}`;
		}
		const { applicationId } = this.requestContext;

		return applicationId ? getStorageKey(applicationId) : null;
	}

	private async getMastraClient(): Promise<MastraClient> {
		const token = await this.rootStore.authStore.getTokenSilently();

		return new MastraClient({
			baseUrl: __CONFIG__.mastraUrl,
			headers: { Authorization: `Bearer ${token}` },
		});
	}

	get transport() {
		return new DefaultChatTransport({
			api: `${__CONFIG__.mastraUrl}/chat/chatAgent`,
			body: { metadata: this.requestContext },
			prepareSendMessagesRequest: async ({ messages }) => {
				const { sub } = this.rootStore.authStore.user!;
				const mastra = await this.getMastraClient();

				let threadId: string | undefined;

				if (!this.activeConversationId) {
					const thread = await mastra.createMemoryThread({
						agentId: 'chatAgent',
						resourceId: sub!,
						title: createConversationTitle(messages),
						metadata: { ...this.requestContext, scope: this.chatScope },
					});

					threadId = thread.id;
					this.activeConversationId = thread.id;

					const workingMemory = this.buildInitialWorkingMemory();
					if (workingMemory) {
						await mastra.updateWorkingMemory({
							agentId: 'chatAgent',
							threadId,
							resourceId: sub,
							workingMemory,
						});
					}

					const key = this.getActiveStorageKey();
					if (key) {
						localStorage.setItem(key, this.activeConversationId);
					}
				}

				return {
					body: {
						messages,
					},
					memory: {
						resourceId: sub,
						threadId,
					},
				};
			},
			fetch: async (url, init?) => {
				// Inject scope and conversationId into each request body
				if (init?.body && typeof init.body === 'string') {
					const parsed = JSON.parse(init.body);

					// if (!this.activeConversationId) {
					// 	this.activeConversationId = crypto.randomUUID();
					// 	const key = this.getActiveStorageKey();
					// 	if (key) {
					// 		localStorage.setItem(key, this.activeConversationId);
					// 	}
					// }

					parsed.threadId = this.activeConversationId;
					parsed.metadata = {
						...parsed.metadata,
						scope: this.chatScope,
						conversationId: this.activeConversationId,
					};

					init = { ...init, body: JSON.stringify(parsed) };
				}

				const regions = this.rootStore.inspectStore.selectedRegions;

				init = {
					...init,
					headers: {
						...(init?.headers as Record<string, string> | undefined),
						'x-thread-id': this.activeConversationId!,
						...(regions.length > 0
							? {
									'X-Focused-Paths': encodeURIComponent(JSON.stringify(regions)),
								}
							: {}),
					},
				};

				const response = await authFetch(url, init);
				// const newConvId = response.headers.get('X-Conversation-Id');

				// if (newConvId && newConvId !== id) {
				// 	this.activeConversationId = newConvId;
				//
				// 	const key = this.getActiveStorageKey();
				// 	if (key) {
				// 		localStorage.setItem(key, newConvId);
				// 	}
				// }

				return response;
			},
		});
	}

	get persistence() {
		return this.rootStore.persistence;
	}

	constructor(private readonly rootStore: RootStore) {
		makeObservable(this);
	}

	async initialize() {
		const { router } = this.rootStore;

		router?.subscribe('onLoad', () => {
			if (this.activeConversationId) {
				return;
			}
		});

		await this.loadLastConversation();
	}

	@action
	addNewConversation() {
		this.activeConversationId = null;

		const key = this.getActiveStorageKey();
		if (key) {
			this.persistence.remove(key);
		}
	}

	@action
	async loadConversation(conversationId: string): Promise<void> {
		const { persistence } = this.rootStore;

		try {
			const mastra = await this.getMastraClient();
			const thread = await mastra
				.getMemoryThread({ threadId: conversationId, agentId: 'chatAgent' })
				.get();
			const { messages } = await mastra.listThreadMessages(conversationId, {
				agentId: 'chatAgent',
			});
			const conversation = Conversation.createFrom({ ...thread, messages });
			this.conversations.set(conversationId, conversation);
			this.activeConversationId = conversationId;

			const key = this.getActiveStorageKey();
			if (key) {
				persistence.store(key, conversationId);
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
			throw error;
		}
	}

	@action
	async loadLastConversation(): Promise<boolean> {
		const { persistence } = this.rootStore;
		const key = this.getActiveStorageKey();

		if (!key) {
			return false;
		}

		const savedId = persistence.retrieve(key) as string;

		if (savedId) {
			this.activeConversationId = savedId;
			await this.loadConversation(savedId);

			return true;
		}

		return false;
	}

	async listConversations(): Promise<ConversationSummary[]> {
		const { sub } = this.rootStore.authStore.user ?? {};
		if (!sub) {
			return [];
		}

		const mastra = await this.getMastraClient();
		const { threads } = await mastra.listMemoryThreads({
			agentId: 'chatAgent',
			resourceId: sub,
			orderBy: { field: 'updatedAt', direction: 'DESC' },
		});

		return threads
			.filter((thread) => this.isInActiveScope(thread.metadata))
			.map((thread) => ({
				id: thread.id,
				title: thread.title ?? 'New Conversation',
				updatedAt: thread.updatedAt,
			}));
	}

	async deleteConversation(conversationId: string): Promise<void> {
		const mastra = await this.getMastraClient();
		await mastra.deleteThread(conversationId, { agentId: 'chatAgent' });
		this.conversations.delete(conversationId);

		if (this.activeConversationId === conversationId) {
			this.addNewConversation();
		}
	}

	private isInActiveScope(metadata: Record<string, unknown> | undefined): boolean {
		const scope = this.chatScope;
		if (scope) {
			return metadata?.scope === scope;
		}

		return metadata?.applicationId === this.requestContext.applicationId;
	}
}

function getStorageKey(applicationId: string): string {
	return `chat:lastConversation:${applicationId}`;
}

function createConversationTitle(messages: unknown[]): string {
	const latestUserMessage = [...messages]
		.reverse()
		.find((message) => (message as { role?: string }).role === 'user') as
		| { parts?: { type?: string; text?: string }[] }
		| undefined;
	const text = latestUserMessage?.parts
		?.filter((part) => part.type === 'text')
		.map((part) => part.text ?? '')
		.join('')
		.replace(/\s+/g, ' ')
		.trim();

	if (!text) {
		return 'New Conversation';
	}

	return text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;
}
