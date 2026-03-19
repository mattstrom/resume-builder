import { Injectable } from '@nestjs/common';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { Resume } from '@resume-builder/web/types';
import { ResumeProvider } from '@resume-builder/web/providers';
import {
	BasicLayout,
	ColumnLayout,
	GridLayout,
} from '../components/ssr-layouts.tsx';

export type TemplateType = 'basic' | 'column' | 'grid';

interface RenderOptions {
	template: TemplateType;
	title?: string;
}

@Injectable()
export class RenderService {
	render(resume: Resume, options: RenderOptions): string {
		const { template, title = 'Resume' } = options;

		// Select the layout component based on template
		const LayoutComponent = this.getLayoutComponent(template);

		// Build the component tree
		const element = createElement(
			ResumeProvider,
			{ data: resume },
			createElement(LayoutComponent),
		);

		// Render to static HTML
		const content = renderToStaticMarkup(element);

		// Wrap in full HTML document
		return this.wrapInDocument(content, title);
	}

	private getLayoutComponent(template: TemplateType) {
		switch (template) {
			case 'column':
				return ColumnLayout;
			case 'grid':
				return GridLayout;
			default:
				return BasicLayout;
		}
	}

	private wrapInDocument(content: string, title: string): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<link rel="stylesheet" href="./styles.css">
</head>
<body>
	${content}
</body>
</html>`;
	}
}
