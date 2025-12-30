import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { NotionClient } from '../tokens.ts';
import { NotionService } from './notion.service.ts';
import type {
	ContactInformation,
	Education,
	Job,
	Project,
	Resume,
	SKillGroup,
} from '../types.ts';
import { RelationReference } from '../models/adapters/relation.adapter.ts';

type PageProperties = PageObjectResponse['properties'];
type PageProperty = PageProperties[string];

@Injectable()
export class ResumeBuilder {
	private name: string | null = null;
	private id: string | null = null;

	constructor(
		private readonly notion: NotionService,
		@Inject(NotionClient) private readonly client: Client,
	) {}

	setName(name: string): this {
		this.name = name;
		this.id = null;
		return this;
	}

	setId(id: string): this {
		this.id = id;
		this.name = null;
		return this;
	}

	async build(): Promise<Resume> {
		if (!this.name && !this.id) {
			throw new Error(
				'Resume name or ID is required. Call setName() or setId() first.',
			);
		}

		const resumePage = this.id
			? await this.notion.findResumeById(this.id)
			: await this.notion.findResumeByName(this.name!);
		const props = resumePage.properties;

		return {
			name: this.getTitle(props['Name']),
			title: this.getRichText(props['Title']),
			summary: this.getRichText(props['Summary']),
			contactInformation: this.extractContactInfo(props),
			workExperience: await this.resolveJobs(props),
			education: await this.resolveEducation(props),
			skills: await this.resolveSkills(props),
			projects: await this.resolveProjects(props),
		};
	}

	private extractContactInfo(props: PageProperties): ContactInformation {
		return {
			location: this.getRichText(props['Location']) ?? '',
			phoneNumber: this.getPhoneNumber(props['Phone']) ?? '',
			email: this.getEmail(props['Email']) ?? '',
			linkedInProfile: this.getUrl(props['LinkedIn Profile']) ?? '',
			githubProfile: this.getUrl(props['GitHub Profile']) ?? '',
		};
	}

	private async resolveJobs(props: PageProperties): Promise<Job[]> {
		const jobRelations = this.getRelation(props['Work History']);
		if (!jobRelations?.length) return [];

		const jobs: Job[] = [];

		for (const ref of jobRelations) {
			const jobPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const jobProps = jobPage.properties;

			const responsibilities = await this.resolveResponsibilities(
				jobProps,
			);
			const startDate = this.getDate(jobProps['Start Date']);
			const endDate = this.getDate(jobProps['End Date']);

			jobs.push({
				company: this.getRichText(jobProps['Company']),
				position: this.getTitle(jobProps['Position']),
				location: this.getRichText(jobProps['Location']),
				startDate: startDate?.start ?? '',
				endDate: endDate?.start ?? undefined,
				responsibilities,
			});
		}

		return jobs;
	}

	private async resolveResponsibilities(
		jobProps: PageProperties,
	): Promise<string[]> {
		const respRelations = this.getRelation(jobProps['Responsibilities']);
		if (!respRelations?.length) return [];

		const responsibilities: string[] = [];

		for (const ref of respRelations) {
			const respPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const respProps = respPage.properties;

			const description = this.getTitle(respProps['Description']);
			if (description) {
				responsibilities.push(description);
			}
		}

		return responsibilities;
	}

	private async resolveEducation(
		props: PageProperties,
	): Promise<Education[]> {
		const eduRelations = this.getRelation(props['Education']);
		if (!eduRelations?.length) return [];

		const education: Education[] = [];

		for (const ref of eduRelations) {
			const eduPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const eduProps = eduPage.properties;

			education.push({
				degree: this.getTitle(eduProps['Degree']),
				field: this.getRichText(eduProps['Field']),
				institution: this.getRichText(eduProps['Institution']),
				graduated: this.getRichText(eduProps['Graduated']),
			});
		}

		return education;
	}

	private async resolveSkills(props: PageProperties): Promise<SKillGroup[]> {
		const skillRelations = this.getRelation(props['Skills']);
		if (!skillRelations?.length) return [];

		const skills: SKillGroup[] = [];

		for (const ref of skillRelations) {
			const skillPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const skillProps = skillPage.properties;

			const items = this.getMultiSelect(skillProps['Items']);
			const itemsText = this.getRichText(skillProps['Items']);

			skills.push({
				name: this.getTitle(skillProps['Name']),
				items: items.length
					? items
					: (itemsText?.split(',').map((s) => s.trim()) ?? []),
			});
		}

		return skills;
	}

	private async resolveProjects(props: PageProperties): Promise<Project[]> {
		const projRelations = this.getRelation(props['Projects']);
		if (!projRelations?.length) return [];

		const projects: Project[] = [];

		for (const ref of projRelations) {
			const projPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const projProps = projPage.properties;

			const technologies = await this.resolveProjectTechnologies(
				projProps,
			);
			const itemsText = this.getRichText(projProps['Items']);

			projects.push({
				name: this.getTitle(projProps['Name']),
				technologies,
				items: itemsText?.split('\n').filter(Boolean) ?? [],
			});
		}

		return projects;
	}

	private async resolveProjectTechnologies(
		projProps: PageProperties,
	): Promise<string[]> {
		const skillRelations = this.getRelation(projProps['Skills']);
		if (!skillRelations?.length) return [];

		const technologies: string[] = [];

		for (const ref of skillRelations) {
			const skillPage = (await this.client.pages.retrieve({
				page_id: ref.id,
			})) as PageObjectResponse;
			const skillProps = skillPage.properties;

			const name = this.getTitle(skillProps['Name']);
			if (name) {
				technologies.push(name);
			}
		}

		return technologies;
	}

	// Property extraction helpers

	private getTitle(prop: PageProperty | undefined): string {
		if (!prop || prop.type !== 'title') return '';
		const title = prop.title as any[];
		return title?.map((t) => t.plain_text).join('') ?? '';
	}

	private getRichText(prop: PageProperty | undefined): string {
		if (!prop || prop.type !== 'rich_text') return '';
		const richText = prop.rich_text as any[];
		return richText?.map((t) => t.plain_text).join('') ?? '';
	}

	private getEmail(prop: PageProperty | undefined): string {
		if (!prop || prop.type !== 'email') return '';
		return (prop as any).email ?? '';
	}

	private getPhoneNumber(prop: PageProperty | undefined): string {
		if (!prop || prop.type !== 'phone_number') return '';
		return (prop as any).phone_number ?? '';
	}

	private getUrl(prop: PageProperty | undefined): string {
		if (!prop || prop.type !== 'url') return '';
		return (prop as any).url ?? '';
	}

	private getDate(
		prop: PageProperty | undefined,
	): { start: string; end?: string } | null {
		if (!prop || prop.type !== 'date') return null;
		const date = (prop as any).date;
		if (!date) return null;
		return { start: date.start ?? '', end: date.end ?? undefined };
	}

	private getRelation(prop: PageProperty | undefined): RelationReference[] {
		if (!prop || prop.type !== 'relation') return [];
		const relation = (prop as any).relation;
		if (!Array.isArray(relation)) return [];
		return relation.map((r: any) => ({ id: r.id }));
	}

	private getMultiSelect(prop: PageProperty | undefined): string[] {
		if (!prop || prop.type !== 'multi_select') return [];
		const multiSelect = (prop as any).multi_select;
		if (!Array.isArray(multiSelect)) return [];
		return multiSelect.map((o: any) => o.name);
	}
}
