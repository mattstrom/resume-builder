import { MastraClient } from '@mastra/client-js';
import {
	chatWorkingMemorySchema,
	type ChatModelOption,
	type ChatModelSelection,
	type ChatModelsResponse,
	type ChatScope,
} from '@resume-builder/entities';
import { DefaultChatTransport } from 'ai';
import { action, computed, makeObservable, observable } from 'mobx';

import type { RootStore } from '@/stores/root.store.ts';
import { authFetch } from '@/utils/auth.ts';

const API_BASE = 'http://localhost:3000';
const MASTRA_API_BASE = 'http://localhost:4111';

interface ConversationPayload {
	_id: string;
	title: string;
	createdAt: string;
	messages: { role: string; content: string; createdAt?: string }[];
	model?: ChatModelSelection;
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
	public model: ChatModelSelection | null = null;

	@observable
	messages: Message[] = [];

	constructor() {
		makeObservable(this);
	}

	static createFrom(payload: ConversationPayload): Conversation {
		const conversation = new Conversation();

		Object.assign(conversation, {
			id: payload._id,
			title: payload.title,
			createdAt: payload.createdAt,
			model: payload.model ?? null,
		});

		payload.messages.forEach((message, index) => {
			conversation.messages.push({
				id: `${payload._id}-${index}`,
				role: message.role as 'user' | 'assistant',
				content: message.content,
				parts: [
					{
						type: 'text',
						text: message.content,
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

	@observable
	models: ChatModelOption[] = [];

	@observable
	defaultModelSelection: ChatModelSelection | null = null;

	@observable
	selectedModel: ChatModelSelection | null = null;

	@computed
	get activeConversation() {
		if (!this.activeConversationId) {
			return null;
		}

		return this.conversations.get(this.activeConversationId) ?? null;
	}

	@computed
	get modelsByProvider() {
		const groups = new Map<string, ChatModelOption[]>();
		for (const model of this.models) {
			const group = groups.get(model.providerLabel) ?? [];
			group.push(model);
			groups.set(model.providerLabel, group);
		}

		return Array.from(groups.entries()).map(([providerLabel, models]) => ({
			providerLabel,
			models,
		}));
	}

	@computed
	get activeModelOption(): ChatModelOption | null {
		if (!this.selectedModel) {
			return null;
		}

		return (
			this.models.find(
				(model) =>
					model.provider === this.selectedModel?.provider &&
					model.model === this.selectedModel?.model,
			) ?? null
		);
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

	get transport() {
		return new DefaultChatTransport({
			api: `${MASTRA_API_BASE}/chat/chatAgent`,
			body: { metadata: this.requestContext },
			prepareSendMessagesRequest: async ({ messages }) => {
				const { sub } = this.rootStore.authStore.user!;
				const token = await this.rootStore.authStore.getTokenSilently();
				const mastra = new MastraClient({
					baseUrl: MASTRA_API_BASE,
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				let threadId: string | undefined;

				if (!this.activeConversationId) {
					const thread = await mastra.createMemoryThread({
						agentId: 'chatAgent',
						resourceId: sub!,
						metadata: this.requestContext,
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
				const id = this.activeConversationId;

				// Inject scope, conversationId, and model into each request body
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
						model: this.selectedModel,
					};

					// init = { ...init, body: JSON.stringify(parsed) };
				}

				init = {
					...init,
					headers: {
						...(init?.headers as Record<string, string> | undefined),
						'x-thread-id': this.activeConversationId!,
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

		await this.loadModelCatalog();
		await this.loadLastConversation();
	}

	@action
	addNewConversation() {
		this.activeConversationId = null;
		this.selectedModel ??= this.defaultModelSelection;

		const key = this.getActiveStorageKey();
		if (key) {
			this.persistence.remove(key);
		}
	}

	@action
	setSelectedModel(model: ChatModelSelection) {
		this.selectedModel = model;

		const activeConversation = this.activeConversation;
		if (activeConversation) {
			activeConversation.model = model;
		}
	}

	@action
	async loadModelCatalog(): Promise<void> {
		const res = await authFetch(`${API_BASE}/api/chat/models`);
		if (!res.ok) {
			throw new Error(`Failed to load chat models: ${res.status} ${res.statusText}`);
		}

		const data = (await res.json()) as ChatModelsResponse;
		this.models = data.models;
		this.defaultModelSelection = data.defaultSelection;
		this.selectedModel = this.resolveModelSelection(this.selectedModel);
	}

	@action
	async loadConversation(conversationId: string): Promise<void> {
		const { persistence } = this.rootStore;

		try {
			const res = await authFetch(`${MASTRA_API_BASE}/api/conversations/${conversationId}`);

			if (!res.ok) {
				throw new Error(`Failed to load conversation: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();

			if (!data) {
				throw new Error('Invalid response from server');
			}

			const conversation = Conversation.createFrom(data);
			this.conversations.set(conversationId, conversation);
			this.activeConversationId = conversationId;
			this.selectedModel = this.resolveModelSelection(conversation.model);

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

		this.selectedModel = this.resolveModelSelection(null);

		return false;
	}

	private resolveModelSelection(
		model: ChatModelSelection | null | undefined,
	): ChatModelSelection | null {
		if (
			model &&
			this.models.some(
				(option) => option.provider === model.provider && option.model === model.model,
			)
		) {
			return model;
		}

		return this.defaultModelSelection;
	}
}

function getStorageKey(applicationId: string): string {
	return `chat:lastConversation:${applicationId}`;
}
