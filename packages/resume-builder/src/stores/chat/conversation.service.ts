import type { RootStore } from '@/stores/root.store.ts';
import { authFetch } from '@/utils/auth.ts';
import { DefaultChatTransport } from 'ai';
import { action, computed, makeObservable, observable } from 'mobx';

const API_BASE = 'http://localhost:3000';

interface ConversationPayload {
	_id: string;
	title: string;
	createdAt: string;
	messages: { role: string; content: string; createdAt?: string }[];
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
			id: payload._id,
			title: payload.title,
			createdAt: payload.createdAt,
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

	@computed
	get activeConversation() {
		if (!this.activeConversationId) {
			return null;
		}

		return this.conversations.get(this.activeConversationId) ?? null;
	}

	@computed
	get scope() {
		const { selectedApplicationId } = this.rootStore.applicationStore;
		const { selectedPaths } = this.rootStore.inspectStore;

		return {
			applicationId: selectedApplicationId,
			highlightedPaths: Array.from(selectedPaths.keys()),
		};
	}

	get transport() {
		return new DefaultChatTransport({
			api: `${API_BASE}/api/chat`,
			body: { data: this.scope },
			fetch: async (url, init?) => {
				const { applicationId } = this.scope;
				const id = this.activeConversationId;

				// Inject current conversationId into each request body
				if (init?.body && typeof init.body === 'string') {
					const parsed = JSON.parse(init.body);
					parsed.data = {
						...parsed.data,
						conversationId: this.activeConversationId,
					};

					init = { ...init, body: JSON.stringify(parsed) };
				}
				const response = await authFetch(url, init);
				const newConvId = response.headers.get('X-Conversation-Id');

				if (newConvId && newConvId !== id) {
					this.activeConversationId = newConvId;

					const key = getStorageKey(applicationId!);

					if (key) {
						localStorage.setItem(key, newConvId);
					}
				}

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
		const conversation = new Conversation();

		Object.assign(conversation, {
			title: 'New Conversation',
			createdAt: new Date().toISOString(),
		});

		this.conversations.set(conversation.id, conversation);
		this.activeConversationId = conversation.id;

		if (!this.scope?.applicationId) {
			return;
		}

		const key = getStorageKey(this.scope.applicationId);
		this.persistence.store(key, conversation.id);
	}

	@action
	async loadConversation(conversationId: string): Promise<void> {
		const { persistence } = this.rootStore;
		const { applicationId } = this.scope;

		try {
			const res = await authFetch(
				`${API_BASE}/api/conversations/${conversationId}`,
			);

			if (!res.ok) {
				throw new Error(
					`Failed to load conversation: ${res.status} ${res.statusText}`,
				);
			}

			const data = await res.json();

			if (!data) {
				throw new Error('Invalid response from server');
			}

			const conversation = Conversation.createFrom(data);
			this.conversations.set(conversationId, conversation);
			this.activeConversationId = conversationId;

			if (applicationId) {
				const key = getStorageKey(applicationId);
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
		const { applicationId } = this.scope;

		if (!applicationId) {
			return false;
		}

		const key = getStorageKey(applicationId);
		const savedId = persistence.retrieve(key) as string;

		if (savedId) {
			this.activeConversationId = savedId;
			await this.loadConversation(savedId);
			return true;
		}

		return false;
	}
}

function getStorageKey(applicationId: string): string {
	return `chat:lastConversation:${applicationId}`;
}
