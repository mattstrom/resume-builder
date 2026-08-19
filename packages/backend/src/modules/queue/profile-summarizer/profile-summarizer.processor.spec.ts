import { stripXmlTags } from './narrative-xml';

describe('stripXmlTags()', () => {
	it('preserves structured job block fields for narrative summarization', () => {
		const narrative = stripXmlTags(
			'<jobBlock><jobField field="company">Acme &amp; Co.</jobField><jobField field="location">Remote</jobField><jobField field="position">Staff Engineer</jobField><jobDateRange><jobField field="startDate">Jan 2023</jobField><jobField field="endDate">Present</jobField></jobDateRange><jobNarrative><heading level="2">Platform work</heading><paragraph>Led the platform migration and mentored engineers.</paragraph></jobNarrative></jobBlock>',
		);

		expect(narrative).toContain('Position: Staff Engineer');
		expect(narrative).toContain('Company: Acme & Co.');
		expect(narrative).toContain('Location: Remote');
		expect(narrative).toContain('Start Date: Jan 2023');
		expect(narrative).toContain('End Date: Present');
		expect(narrative).toContain('Narrative:');
		expect(narrative).toContain('Led the platform migration and mentored engineers.');
	});

	it('supports lowercased job tags from existing narrative mirrors', () => {
		const narrative = stripXmlTags(
			'<jobblock><jobfield field="company">Acme</jobfield><jobfield field="position">Engineer</jobfield><jobnarrative><paragraph>Built products.</paragraph></jobnarrative></jobblock>',
		);

		expect(narrative).toContain('Company: Acme');
		expect(narrative).toContain('Position: Engineer');
		expect(narrative).toContain('Built products.');
	});
});
