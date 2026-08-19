import { parseResumeXmlElements } from '@resume-builder/entities';
import { describe, expect, it } from 'vitest';

import { getMovableXmlChild, indexBlockBindings, resumeXmlToBlocks } from './resume-xml-blocks.ts';

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
			allowChildReorder: true,
		});
		expect(job).toMatchObject({ type: 'record', ariaLabel: 'role' });
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
});
