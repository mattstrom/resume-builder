import { ConversationService } from '@/stores/chat/conversation.service.ts';
import { InlineEditStore } from '@/stores/inline-edit.store.ts';
import { InspectStore } from '@/stores/inspect.store.ts';
import { ListEditStore } from '@/stores/list-edit.store.ts';
import { ThemeStore } from '@/stores/theme.store.ts';
import { UiStateStore } from '@/stores/ui-state.store.ts';
import { ExplorerSidebarStore } from '@/stores/explorer-sidebar.store.ts';
import { ApolloClient } from '@apollo/client';
import type { AnyRoute, Router } from '@tanstack/react-router';
import { client as apolloClient } from '../apollo-client.ts';
import { AuthStore } from './auth.store.ts';
import { ApplicationStore } from './application.store.ts';
import { ResumeStore } from './resume.store.ts';
import { PersistenceService } from '@/stores/services/persistence.service.ts';

let singleton: RootStore;

export class RootStore<R extends AnyRoute = any> {
	public router: Router<any> | null = null;
	public readonly client: ApolloClient;
	public readonly persistence = new PersistenceService();

	public readonly authStore: AuthStore;
	public readonly applicationStore: ApplicationStore;
	public readonly explorerSidebarStore: ExplorerSidebarStore;
	public readonly inlineEditStore: InlineEditStore;
	public readonly inspectStore: InspectStore;
	public readonly listEditStore: ListEditStore;
	public readonly resumeStore: ResumeStore;
	public readonly themeStore: ThemeStore;
	public readonly uiStateStore: UiStateStore = new UiStateStore(this);
	public readonly conversationService: ConversationService;

	constructor(client?: ApolloClient) {
		this.client = client ?? apolloClient;
		this.authStore = new AuthStore(this);
		this.applicationStore = new ApplicationStore(this);
		this.explorerSidebarStore = new ExplorerSidebarStore(this);
		this.inlineEditStore = new InlineEditStore(this);
		this.inspectStore = new InspectStore(this);
		this.listEditStore = new ListEditStore(this);
		this.resumeStore = new ResumeStore(this);
		this.themeStore = new ThemeStore(this);
		this.uiStateStore = new UiStateStore(this);
		this.conversationService = new ConversationService(this);

		if (import.meta.env.DEV) {
			globalThis.rootStore = this;
		}
	}

	setRouter(router: Router<R>) {
		this.router = router;
	}

	static getInstance<R extends AnyRoute = any>() {
		singleton ??= new RootStore<R>();
		return singleton;
	}
}
