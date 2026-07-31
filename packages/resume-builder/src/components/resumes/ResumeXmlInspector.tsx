import Editor from '@monaco-editor/react';
import { validateResumeXml } from '@resume-builder/entities';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getActiveResumeController } from '@/lib/active-resume-controller.ts';
import { useStore } from '@/stores/store.provider.tsx';

import { Button } from '../ui/button.tsx';

function escapeXmlText(value: string) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeXmlAttribute(value: string) {
	return escapeXmlText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function serializeInlineNode(node: Node): string {
	switch (node.nodeType) {
		case Node.ELEMENT_NODE:
			return serializeXmlElement(node as Element, 0, true);
		case Node.TEXT_NODE:
			return escapeXmlText(node.nodeValue ?? '');
		case Node.CDATA_SECTION_NODE:
			return `<![CDATA[${node.nodeValue ?? ''}]]>`;
		case Node.COMMENT_NODE:
			return `<!--${node.nodeValue ?? ''}-->`;
		case Node.PROCESSING_INSTRUCTION_NODE: {
			const instruction = node as ProcessingInstruction;
			return `<?${instruction.target}${instruction.data ? ` ${instruction.data}` : ''}?>`;
		}
		default:
			return '';
	}
}

function serializeXmlElement(element: Element, depth: number, inline = false): string {
	const indentation = inline ? '' : '  '.repeat(depth);
	const attributes = Array.from(element.attributes)
		.map((attribute) => ` ${attribute.name}="${escapeXmlAttribute(attribute.value)}"`)
		.join('');
	const openingTag = `<${element.tagName}${attributes}>`;
	const closingTag = `</${element.tagName}>`;
	const children = Array.from(element.childNodes);

	if (children.length === 0) {
		return `${indentation}${openingTag}${closingTag}`;
	}

	const hasElementChildren = children.some((child) => child.nodeType === Node.ELEMENT_NODE);
	const hasMeaningfulText = children.some(
		(child) => child.nodeType === Node.TEXT_NODE && Boolean(child.nodeValue?.trim()),
	);

	// Mixed content is semantically whitespace-sensitive. Keep it inline so
	// formatting a lineage or ontology element inside a bullet cannot alter
	// the projected resume text.
	if (inline || hasMeaningfulText) {
		return indentation + openingTag + children.map(serializeInlineNode).join('') + closingTag;
	}

	if (!hasElementChildren) {
		return `${indentation}${openingTag}${children
			.map(serializeInlineNode)
			.join('')}${closingTag}`;
	}

	const content = children
		.filter((child) => child.nodeType !== Node.TEXT_NODE || Boolean(child.nodeValue?.trim()))
		.map((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) {
				return serializeXmlElement(child as Element, depth + 1);
			}
			return `${'  '.repeat(depth + 1)}${serializeInlineNode(child)}`;
		})
		.join('\n');

	return `${indentation}${openingTag}\n${content}\n${indentation}${closingTag}`;
}

export function prettyPrintResumeXml(xml: string): string {
	if (!xml.trim()) return xml;

	const document = new DOMParser().parseFromString(xml, 'application/xml');
	const parserError = document.querySelector('parsererror');
	if (parserError) {
		throw new Error(parserError.textContent ?? 'Invalid XML');
	}

	const declaration = xml.match(/^\s*(<\?xml[^?]*\?>)/)?.[1];
	const formatted = serializeXmlElement(document.documentElement, 0);
	return declaration ? `${declaration}\n${formatted}` : formatted;
}

function prettyPrintOrOriginal(xml: string) {
	try {
		return prettyPrintResumeXml(xml);
	} catch {
		return xml;
	}
}

export const ResumeXmlInspector = observer(function ResumeXmlInspector() {
	const { editorStore, themeStore } = useStore();
	const resume = editorStore.resumeData;
	const currentXml = resume?.xml ?? '';
	const [buffer, setBuffer] = useState(() => prettyPrintOrOriginal(currentXml));
	const [baseXml, setBaseXml] = useState(currentXml);
	const dirty = buffer !== prettyPrintOrOriginal(baseXml);

	useEffect(() => {
		if (!dirty) {
			setBuffer(prettyPrintOrOriginal(currentXml));
			setBaseXml(currentXml);
		}
	}, [currentXml, dirty]);

	if (!resume) return null;

	const apply = () => {
		if (baseXml !== currentXml) {
			toast.error('The resume changed while you were editing. Refresh the XML buffer first.');
			return;
		}
		const validation = validateResumeXml(buffer);
		if (!validation.valid) {
			toast.error(validation.errors.join('; '));
			return;
		}
		getActiveResumeController(resume._id)?.replaceXml(buffer);
		setBaseXml(buffer);
		setBuffer(prettyPrintOrOriginal(buffer));
		toast.success('XML applied');
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center justify-between border-b px-4 py-2">
				<div>
					<div className="text-sm font-medium">Canonical resume XML</div>
					<div className="text-xs text-muted-foreground">
						Changes are validated and applied as one collaborative transaction.
					</div>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => {
							try {
								setBuffer(prettyPrintResumeXml(buffer));
							} catch (error) {
								toast.error(
									error instanceof Error ? error.message : 'Could not format XML',
								);
							}
						}}
					>
						Pretty print
					</Button>
					<Button
						variant="outline"
						disabled={!dirty}
						onClick={() => {
							setBuffer(prettyPrintOrOriginal(currentXml));
							setBaseXml(currentXml);
						}}
					>
						Refresh
					</Button>
					<Button disabled={!dirty} onClick={apply}>
						Apply XML
					</Button>
				</div>
			</div>
			<Editor
				className="min-h-0 flex-1"
				language="xml"
				theme={themeStore.resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
				value={buffer}
				onChange={(value) => setBuffer(value ?? '')}
				options={{
					automaticLayout: true,
					minimap: { enabled: false },
					wordWrap: 'on',
					formatOnPaste: true,
					formatOnType: true,
					tabSize: 2,
				}}
			/>
		</div>
	);
});
