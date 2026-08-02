// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/import-onet.mjs
//
// Derived from the O*NET 30.0 Database by the U.S. Department of Labor,
// Employment and Training Administration (USDOL/ETA). Used under the
// CC BY 4.0 license. O*NET is a trademark of USDOL/ETA.

import { vocabulary } from '../core/vocabulary.js';

/**
 * What kind of software a technology is.
 *
 * The lower level comes from the categories O*NET assigns to each technology;
 * the 17 top-level buckets are authored, and are the level you actually want
 * when grouping a resume's skills section.
 */
export const technologyCategory = vocabulary(
	'technology-category',
	{
		'business-applications': { label: 'Business Applications' },
		'finance-and-accounting': { label: 'Finance and Accounting' },
		'media-and-entertainment': { label: 'Media and Entertainment' },
		'design-and-productivity': { label: 'Design and Productivity' },
		'content-management': { label: 'Content Management' },
		'data-and-analytics': { label: 'Data and Analytics' },
		'software-development': { label: 'Software Development' },
		'education-and-language': { label: 'Education and Language' },
		'industry-specific': { label: 'Industry-Specific Systems' },
		'application-and-web-servers': { label: 'Application and Web Servers' },
		'network-management': { label: 'Network Management' },
		networking: { label: 'Networking' },
		'operating-systems-and-storage': { label: 'Operating Systems and Storage' },
		security: { label: 'Security' },
		'system-utilities': { label: 'System Utilities' },
		'communication-and-collaboration': { label: 'Communication and Collaboration' },
		'enterprise-management': { label: 'Enterprise Management' },
		'helpdesk-or-call-center-software': {
			label: 'Helpdesk or call center software',
			parent: 'business-applications',
		},
		'procurement-software': {
			label: 'Procurement software',
			parent: 'business-applications',
		},
		'human-resources-software': {
			label: 'Human resources software',
			parent: 'business-applications',
		},
		'materials-requirements-planning-logistics-and-supply-chain-software': {
			label: 'Materials requirements planning logistics and supply chain software',
			parent: 'business-applications',
		},
		'project-management-software': {
			label: 'Project management software',
			parent: 'business-applications',
		},
		'inventory-management-software': {
			label: 'Inventory management software',
			parent: 'business-applications',
		},
		'bar-coding-software': {
			label: 'Bar coding software',
			parent: 'business-applications',
		},
		'label-making-software': {
			label: 'Label making software',
			parent: 'business-applications',
		},
		'expert-system-software': {
			label: 'Expert system software',
			parent: 'business-applications',
		},
		'license-management-software': {
			label: 'License management software',
			parent: 'business-applications',
		},
		'office-suite-software': {
			label: 'Office suite software',
			parent: 'business-applications',
		},
		'sales-and-marketing-software': {
			label: 'Sales and marketing software',
			parent: 'business-applications',
		},
		'mailing-and-shipping-software': {
			label: 'Mailing and shipping software',
			parent: 'business-applications',
		},
		'audit-software': {
			label: 'Audit software',
			parent: 'business-applications',
		},
		'procedure-management-software': {
			label: 'Procedure management software',
			parent: 'business-applications',
		},
		'process-mapping-and-design-software': {
			label: 'Process mapping and design software',
			parent: 'business-applications',
		},
		'accounting-software': {
			label: 'Accounting software',
			parent: 'finance-and-accounting',
		},
		'enterprise-resource-planning-erp-software': {
			label: 'Enterprise resource planning ERP software',
			parent: 'finance-and-accounting',
		},
		'tax-preparation-software': {
			label: 'Tax preparation software',
			parent: 'finance-and-accounting',
		},
		'financial-analysis-software': {
			label: 'Financial analysis software',
			parent: 'finance-and-accounting',
		},
		'time-accounting-software': {
			label: 'Time accounting software',
			parent: 'finance-and-accounting',
		},
		'action-games': {
			label: 'Action games',
			parent: 'media-and-entertainment',
		},
		'music-or-sound-editing-software': {
			label: 'Music or sound editing software',
			parent: 'media-and-entertainment',
		},
		'pattern-design-software': {
			label: 'Pattern design software',
			parent: 'design-and-productivity',
		},
		'graphics-or-photo-imaging-software': {
			label: 'Graphics or photo imaging software',
			parent: 'design-and-productivity',
		},
		'video-creation-and-editing-software': {
			label: 'Video creation and editing software',
			parent: 'design-and-productivity',
		},
		'word-processing-software': {
			label: 'Word processing software',
			parent: 'design-and-productivity',
		},
		'charting-software': {
			label: 'Charting software',
			parent: 'design-and-productivity',
		},
		'presentation-software': {
			label: 'Presentation software',
			parent: 'design-and-productivity',
		},
		'web-page-creation-and-editing-software': {
			label: 'Web page creation and editing software',
			parent: 'design-and-productivity',
		},
		'calendar-and-scheduling-software': {
			label: 'Calendar and scheduling software',
			parent: 'design-and-productivity',
		},
		'spreadsheet-software': {
			label: 'Spreadsheet software',
			parent: 'design-and-productivity',
		},
		'optical-character-reader-ocr-or-scanning-software': {
			label: 'Optical character reader OCR or scanning software',
			parent: 'design-and-productivity',
		},
		'desktop-publishing-software': {
			label: 'Desktop publishing software',
			parent: 'design-and-productivity',
		},
		'content-workflow-software': {
			label: 'Content workflow software',
			parent: 'content-management',
		},
		'document-management-software': {
			label: 'Document management software',
			parent: 'content-management',
		},
		'file-versioning-software': {
			label: 'File versioning software',
			parent: 'content-management',
		},
		'categorization-or-classification-software': {
			label: 'Categorization or classification software',
			parent: 'data-and-analytics',
		},
		'clustering-software': {
			label: 'Clustering software',
			parent: 'data-and-analytics',
		},
		'customer-relationship-management-crm-software': {
			label: 'Customer relationship management CRM software',
			parent: 'data-and-analytics',
		},
		'data-base-management-system-software': {
			label: 'Data base management system software',
			parent: 'data-and-analytics',
		},
		'data-base-reporting-software': {
			label: 'Data base reporting software',
			parent: 'data-and-analytics',
		},
		'data-base-user-interface-and-query-software': {
			label: 'Data base user interface and query software',
			parent: 'data-and-analytics',
		},
		'data-mining-software': {
			label: 'Data mining software',
			parent: 'data-and-analytics',
		},
		'information-retrieval-or-search-software': {
			label: 'Information retrieval or search software',
			parent: 'data-and-analytics',
		},
		'metadata-management-software': {
			label: 'Metadata management software',
			parent: 'data-and-analytics',
		},
		'object-oriented-data-base-management-software': {
			label: 'Object oriented data base management software',
			parent: 'data-and-analytics',
		},
		'portal-server-software': {
			label: 'Portal server software',
			parent: 'data-and-analytics',
		},
		'transaction-server-software': {
			label: 'Transaction server software',
			parent: 'data-and-analytics',
		},
		'business-intelligence-and-data-analysis-software': {
			label: 'Business intelligence and data analysis software',
			parent: 'data-and-analytics',
		},
		'configuration-management-software': {
			label: 'Configuration management software',
			parent: 'software-development',
		},
		'development-environment-software': {
			label: 'Development environment software',
			parent: 'software-development',
		},
		'enterprise-application-integration-software': {
			label: 'Enterprise application integration software',
			parent: 'software-development',
		},
		'graphical-user-interface-development-software': {
			label: 'Graphical user interface development software',
			parent: 'software-development',
		},
		'object-or-component-oriented-development-software': {
			label: 'Object or component oriented development software',
			parent: 'software-development',
		},
		'program-testing-software': {
			label: 'Program testing software',
			parent: 'software-development',
		},
		'requirements-analysis-and-system-architecture-software': {
			label: 'Requirements analysis and system architecture software',
			parent: 'software-development',
		},
		'web-platform-development-software': {
			label: 'Web platform development software',
			parent: 'software-development',
		},
		'compiler-and-decompiler-software': {
			label: 'Compiler and decompiler software',
			parent: 'software-development',
		},
		'foreign-language-software': {
			label: 'Foreign language software',
			parent: 'education-and-language',
		},
		'computer-based-training-software': {
			label: 'Computer based training software',
			parent: 'education-and-language',
		},
		'spell-checkers': {
			label: 'Spell checkers',
			parent: 'education-and-language',
		},
		'route-navigation-software': {
			label: 'Route navigation software',
			parent: 'education-and-language',
		},
		'multi-media-educational-software': {
			label: 'Multi-media educational software',
			parent: 'education-and-language',
		},
		'dictionary-software': {
			label: 'Dictionary software',
			parent: 'education-and-language',
		},
		'voice-synthesizer-and-recognition-software': {
			label: 'Voice synthesizer and recognition software',
			parent: 'education-and-language',
		},
		'geographic-information-system': {
			label: 'Geographic information system',
			parent: 'education-and-language',
		},
		'aviation-ground-support-software': {
			label: 'Aviation ground support software',
			parent: 'industry-specific',
		},
		'facilities-management-software': {
			label: 'Facilities management software',
			parent: 'industry-specific',
		},
		'computer-aided-design-cad-software': {
			label: 'Computer aided design CAD software',
			parent: 'industry-specific',
		},
		'analytical-or-scientific-software': {
			label: 'Analytical or scientific software',
			parent: 'industry-specific',
		},
		'compliance-software': {
			label: 'Compliance software',
			parent: 'industry-specific',
		},
		'flight-control-software': {
			label: 'Flight control software',
			parent: 'industry-specific',
		},
		'industrial-control-software': {
			label: 'Industrial control software',
			parent: 'industry-specific',
		},
		'library-software': {
			label: 'Library software',
			parent: 'industry-specific',
		},
		'medical-software': {
			label: 'Medical software',
			parent: 'industry-specific',
		},
		'point-of-sale-pos-software': {
			label: 'Point of sale POS software',
			parent: 'industry-specific',
		},
		'computer-aided-manufacturing-cam-software': {
			label: 'Computer aided manufacturing CAM software',
			parent: 'industry-specific',
		},
		'manufacturing-execution-system-mes-software': {
			label: 'Manufacturing execution system MES software',
			parent: 'industry-specific',
		},
		'computer-aided-design-cad-and-computer-aided-manufacturing-cam-system': {
			label: 'Computer aided design CAD and computer aided manufacturing CAM system',
			parent: 'industry-specific',
		},
		'legal-management-software': {
			label: 'Legal management software',
			parent: 'industry-specific',
		},
		'risk-management-data-and-analysis-software': {
			label: 'Risk management data and analysis software',
			parent: 'industry-specific',
		},
		'application-server-software': {
			label: 'Application server software',
			parent: 'application-and-web-servers',
		},
		'desktop-communications-software': {
			label: 'Desktop communications software',
			parent: 'application-and-web-servers',
		},
		'interactive-voice-response-software': {
			label: 'Interactive voice response software',
			parent: 'application-and-web-servers',
		},
		'internet-directory-services-software': {
			label: 'Internet directory services software',
			parent: 'application-and-web-servers',
		},
		'internet-browser-software': {
			label: 'Internet browser software',
			parent: 'application-and-web-servers',
		},
		'network-monitoring-software': {
			label: 'Network monitoring software',
			parent: 'network-management',
		},
		'network-operating-system-enhancement-software': {
			label: 'Network operating system enhancement software',
			parent: 'network-management',
		},
		'optical-network-management-software': {
			label: 'Optical network management software',
			parent: 'network-management',
		},
		'administration-software': {
			label: 'Administration software',
			parent: 'network-management',
		},
		'internet-protocol-ip-multimedia-subsystem-software': {
			label: 'Internet protocol IP multimedia subsystem software',
			parent: 'network-management',
		},
		'cloud-based-management-software': {
			label: 'Cloud-based management software',
			parent: 'network-management',
		},
		'access-software': {
			label: 'Access software',
			parent: 'networking',
		},
		'communications-server-software': {
			label: 'Communications server software',
			parent: 'networking',
		},
		'contact-center-software': {
			label: 'Contact center software',
			parent: 'networking',
		},
		'fax-software': {
			label: 'Fax software',
			parent: 'networking',
		},
		'lan-software': {
			label: 'LAN software',
			parent: 'networking',
		},
		'storage-networking-software': {
			label: 'Storage networking software',
			parent: 'networking',
		},
		'switch-or-router-software': {
			label: 'Switch or router software',
			parent: 'networking',
		},
		'wan-switching-software-and-firmware': {
			label: 'WAN switching software and firmware',
			parent: 'networking',
		},
		'wireless-software': {
			label: 'Wireless software',
			parent: 'networking',
		},
		'network-connectivity-terminal-emulation-software': {
			label: 'Network connectivity terminal emulation software',
			parent: 'networking',
		},
		'gateway-software': {
			label: 'Gateway software',
			parent: 'networking',
		},
		'bridge-software': {
			label: 'Bridge software',
			parent: 'networking',
		},
		'platform-interconnectivity-software': {
			label: 'Platform interconnectivity software',
			parent: 'networking',
		},
		'software-defined-networking-virtualization-software': {
			label: 'Software defined networking/ virtualization software',
			parent: 'networking',
		},
		'filesystem-software': {
			label: 'Filesystem software',
			parent: 'operating-systems-and-storage',
		},
		'network-operation-system-software': {
			label: 'Network operation system software',
			parent: 'operating-systems-and-storage',
		},
		'operating-system-software': {
			label: 'Operating system software',
			parent: 'operating-systems-and-storage',
		},
		'computer-imaging-software': {
			label: 'Computer imaging software',
			parent: 'operating-systems-and-storage',
		},
		'authentication-server-software': {
			label: 'Authentication server software',
			parent: 'security',
		},
		'network-security-or-virtual-private-network-vpn-management-software': {
			label: 'Network security or virtual private network VPN management software',
			parent: 'security',
		},
		'network-security-and-virtual-private-network-vpn-equipment-software': {
			label: 'Network security and virtual private network VPN equipment software',
			parent: 'security',
		},
		'transaction-security-and-virus-protection-software': {
			label: 'Transaction security and virus protection software',
			parent: 'security',
		},
		'cloud-based-protection-or-security-software': {
			label: 'Cloud-based protection or security software',
			parent: 'security',
		},
		'data-conversion-software': {
			label: 'Data conversion software',
			parent: 'system-utilities',
		},
		'data-compression-software': {
			label: 'Data compression software',
			parent: 'system-utilities',
		},
		'device-drivers-or-system-software': {
			label: 'Device drivers or system software',
			parent: 'system-utilities',
		},
		'graphics-card-driver-software': {
			label: 'Graphics card driver software',
			parent: 'system-utilities',
		},
		'printer-driver-software': {
			label: 'Printer driver software',
			parent: 'system-utilities',
		},
		'voice-recognition-software': {
			label: 'Voice recognition software',
			parent: 'system-utilities',
		},
		'storage-media-loading-software': {
			label: 'Storage media loading software',
			parent: 'system-utilities',
		},
		'backup-or-archival-software': {
			label: 'Backup or archival software',
			parent: 'system-utilities',
		},
		'text-to-speech-conversion-software': {
			label: 'Text to speech conversion software',
			parent: 'system-utilities',
		},
		'electronic-mail-software': {
			label: 'Electronic mail software',
			parent: 'communication-and-collaboration',
		},
		'video-conferencing-software': {
			label: 'Video conferencing software',
			parent: 'communication-and-collaboration',
		},
		'network-conferencing-software': {
			label: 'Network conferencing software',
			parent: 'communication-and-collaboration',
		},
		'instant-messaging-software': {
			label: 'Instant messaging software',
			parent: 'communication-and-collaboration',
		},
		'map-creation-software': {
			label: 'Map creation software',
			parent: 'communication-and-collaboration',
		},
		'mobile-operator-specific-application-software': {
			label: 'Mobile operator specific application software',
			parent: 'communication-and-collaboration',
		},
		'mobile-messaging-service-software': {
			label: 'Mobile messaging service software',
			parent: 'communication-and-collaboration',
		},
		'mobile-location-based-services-software': {
			label: 'Mobile location based services software',
			parent: 'communication-and-collaboration',
		},
		'cloud-based-data-access-and-sharing-software': {
			label: 'Cloud-based data access and sharing software',
			parent: 'communication-and-collaboration',
		},
		'enterprise-system-management-software': {
			label: 'Enterprise system management software',
			parent: 'enterprise-management',
		},
	},
	{
		title: 'Technology Category',
		description: 'Kind of software or platform.',
	},
);
