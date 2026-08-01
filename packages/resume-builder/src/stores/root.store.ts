import { ApolloClient } from '@apollo/client';
import type { AnyRoute, Router } from '@tanstack/react-router';

import { ConversationService } from '@/stores/chat/conversation.service.ts';
import { ExplorerSidebarStore } from '@/stores/explorer-sidebar.store.ts';
import { InlineEditStore } from '@/stores/inline-edit.store.ts';
import { InspectStore } from '@/stores/inspect.store.ts';
import { ListEditStore } from '@/stores/list-edit.store.ts';
import { PersistenceService } from '@/stores/services/persistence.service.ts';
import { ThemeStore } from '@/stores/theme.store.ts';
import { UiStateStore } from '@/stores/ui-state.store.ts';

import { client as apolloClient } from '../apollo-client.ts';
import { ApplicationStore } from './application.store.ts';
import { AuthStore } from './auth.store.ts';
import { BulletsStore } from './bullets.store.ts';
import { ContactInformationStore } from './contact-information.store.ts';
import { EditorStore } from './editor.store.ts';
import { EducationStore } from './education.store.ts';
import { FactsStore } from './facts.store.ts';
import { JobsStore } from './jobs.store.ts';
import { ProfileStore } from './profile.store.ts';
import { ProjectsStore } from './projects.store.ts';
import { ResumeStore } from './resume.store.ts';
import { SkillsStore } from './skills.store.ts';
import { VolunteeringStore } from './volunteering.store.ts';

let singleton: RootStore;

export class RootStore<R extends AnyRoute = any> {
	public router: Router<any> | null = null;
	public readonly client: ApolloClient;
	public readonly persistence = new PersistenceService();

	public readonly authStore: AuthStore;
	public readonly bulletsStore: BulletsStore;
	public readonly applicationStore: ApplicationStore;
	public readonly contactInformationStore: ContactInformationStore;
	public readonly editorStore: EditorStore;
	public readonly educationStore: EducationStore;
	public readonly factsStore: FactsStore;
	public readonly jobsStore: JobsStore;
	public readonly projectsStore: ProjectsStore;
	public readonly skillsStore: SkillsStore;
	public readonly volunteeringStore: VolunteeringStore;
	public readonly explorerSidebarStore: ExplorerSidebarStore;
	public readonly inlineEditStore: InlineEditStore;
	public readonly inspectStore: InspectStore;
	public readonly listEditStore: ListEditStore;
	public readonly profileStore: ProfileStore;
	public readonly resumeStore: ResumeStore;
	public readonly themeStore: ThemeStore;
	public readonly uiStateStore: UiStateStore = new UiStateStore(this);
	public readonly conversationService: ConversationService;

	constructor(client?: ApolloClient) {
		this.client = client ?? apolloClient;
		this.authStore = new AuthStore(this);
		this.bulletsStore = new BulletsStore(this);
		this.applicationStore = new ApplicationStore(this);
		this.contactInformationStore = new ContactInformationStore(this);
		this.editorStore = new EditorStore(this);
		this.educationStore = new EducationStore(this);
		this.factsStore = new FactsStore(this);
		this.jobsStore = new JobsStore(this);
		this.projectsStore = new ProjectsStore(this);
		this.skillsStore = new SkillsStore(this);
		this.volunteeringStore = new VolunteeringStore(this);
		this.explorerSidebarStore = new ExplorerSidebarStore(this);
		this.inlineEditStore = new InlineEditStore(this);
		this.inspectStore = new InspectStore(this);
		this.listEditStore = new ListEditStore(this);
		this.profileStore = new ProfileStore(this);
		this.resumeStore = new ResumeStore(this);
		this.themeStore = new ThemeStore(this);
		this.uiStateStore = new UiStateStore(this);
		this.conversationService = new ConversationService(this);

		if (import.meta.env.DEV) {
			globalThis.rootStore = this;
		}
	}

	async initialize() {
		await this.conversationService.initialize();
	}

	async setRouter(router: Router<R>) {
		this.router = router;
		await this.initialize();
	}

	static getInstance<R extends AnyRoute = any>() {
		singleton ??= new RootStore<R>();
		return singleton;
	}
}
