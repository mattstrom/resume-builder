import { parseResumeXmlElements } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import {
	createResumeXmlElement,
	getMovableXmlChild,
	getResumeXmlInsertOptions,
	getXmlChildInsertIndex,
	indexBlockBindings,
	resumeXmlToBlocks,
} from './resume-xml-blocks.ts';

const xml = [
	'<resume xmlns="https://mattstrom.com/schemas/resume"',
	' xmlns:xml="http://www.w3.org/XML/1998/namespace"',
	' schema-version="1" xml:id="resume-1">',
	'<contact-info xml:id="contact"><name xml:id="name">Alex</name></contact-info>',
	'<headline xml:id="headline">Engineer</headline>',
	'<summary xml:id="summary">Summary</summary>',
	'<education xml:id="education"></education>',
	'<work-experience xml:id="work">',
	'<job xml:id="job-1" title="Staff Engineer" company="Acme">',
	'<description xml:id="description-1"></description>',
	'<responsibilities xml:id="responsibilities-1">',
	'<responsibility xml:id="bullet-1" bullet-id="bank-1">Impact</responsibility>',
	'</responsibilities></job></work-experience>',
	'<skills xml:id="skills"></skills>',
	'<projects xml:id="projects"></projects>',
	'<volunteer-experiences xml:id="volunteering"></volunteer-experiences>',
	'</resume>',
].join('');

describe('resume XML block mapping', () => {
	it('maps XML containers, records, attributes, and text to blocks', () => {
		const blocks = resumeXmlToBlocks(parseResumeXmlElements(xml));
		const work = blocks.find((block) => block.id === 'work');
		const job = work?.children?.[0];
		const bindings = indexBlockBindings(blocks);

		expect(work).toMatchObject({
			type: 'section',
			text: 'Work Experience',
			schemaType: 'work-experience',
			schemaLabel: 'Work Experience',
			allowChildReorder: true,
		});
		expect(job).toMatchObject({
			type: 'record',
			ariaLabel: 'role',
			schemaType: 'job',
			schemaLabel: 'Work experience',
		});
		expect(job?.children?.[0]).toMatchObject({
			type: 'heading-3',
			text: 'Staff Engineer',
		});
		expect(bindings.get('job-1::attribute::title')).toEqual({
			kind: 'attribute',
			xmlId: 'job-1',
			name: 'title',
		});
		expect(bindings.get('bullet-1')).toEqual({ kind: 'text', xmlId: 'bullet-1' });
		expect(getMovableXmlChild(blocks, 'work', 0)?.id).toBe('job-1');
	});

	it('offers only schema-ordered elements at each insertion slot', () => {
		const root = parseResumeXmlElements(xml);
		const blocks = resumeXmlToBlocks(root);
		const skills = blocks.find((block) => block.id === 'skills');
		if (!skills) throw new Error('Expected skills block');
		skills.children = [
			{
				id: 'skill-1',
				type: 'bullet',
				text: '',
				binding: { kind: 'text', xmlId: 'skill-1' },
			},
			{ id: 'group-1', type: 'record', text: '' },
		];
		const skillsNode = root.children.find((node) => node.xmlId === 'skills');
		if (!skillsNode) throw new Error('Expected skills XML node');
		skillsNode.children = [
			{ name: 'skill', xmlId: 'skill-1', attributes: {}, text: '', children: [] },
			{ name: 'skill-group', xmlId: 'group-1', attributes: {}, text: '', children: [] },
		];

		expect(getResumeXmlInsertOptions(root, 'skills', 0).map((option) => option.id)).toEqual([
			'skill',
		]);
		expect(getResumeXmlInsertOptions(root, 'skills', 1).map((option) => option.id)).toEqual([
			'skill',
			'skill-group',
		]);
		expect(getResumeXmlInsertOptions(root, 'skills', 2).map((option) => option.id)).toEqual([
			'skill-group',
		]);
		expect(getXmlChildInsertIndex(blocks, 'skills', 1)).toBe(1);
	});

	it('offers missing sections only at their schema-compliant root slot', () => {
		const root = parseResumeXmlElements(xml);
		root.children = root.children.filter((node) => node.name !== 'education');
		const workIndex = root.children.findIndex((node) => node.name === 'work-experience');

		expect(
			getResumeXmlInsertOptions(root, root.xmlId, workIndex).map((option) => option.id),
		).toEqual(['education']);
		expect(getResumeXmlInsertOptions(root, root.xmlId, 0)).toEqual([]);
	});

	it('creates complete record skeletons with stable XML ids', () => {
		let nextId = 0;
		const result = createResumeXmlElement('project', () => `node-${++nextId}`);

		expect(result).toBe(
			'<project xml:id="node-1"><description xml:id="node-2"></description>' +
				'<items xml:id="node-3"></items><technologies xml:id="node-4"></technologies></project>',
		);
	});
});
