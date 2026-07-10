import { stripXmlTags } from './narrative-xml';

describe('stripXmlTags()', () => {
	it('preserves structured job block fields for narrative summarization', () => {
		const narrative = stripXmlTags(
			'<jobBlock position="Staff Engineer" company="Acme &amp; Co." location="Remote" startDate="Jan 2023" endDate="Present" narrative="Led the platform migration and mentored engineers."></jobBlock>',
		);

		expect(narrative).toContain('Position: Staff Engineer');
		expect(narrative).toContain('Company: Acme & Co.');
		expect(narrative).toContain('Location: Remote');
		expect(narrative).toContain('Start Date: Jan 2023');
		expect(narrative).toContain('End Date: Present');
		expect(narrative).toContain('Narrative:');
		expect(narrative).toContain('Led the platform migration and mentored engineers.');
	});
});
