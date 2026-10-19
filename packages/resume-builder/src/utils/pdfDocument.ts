/** Capture a static document that can render without the preview's origin. */
export async function capturePdfHtml(doc: Document): Promise<string> {
	const clone = doc.documentElement.cloneNode(true) as HTMLElement;
	const assets = new Map<string, Promise<string>>();

	const embedAsset = (url: string): Promise<string> => {
		let asset = assets.get(url);
		if (!asset) {
			asset = fetch(url).then(async (response) => {
				if (!response.ok) throw new Error('Failed to load a PDF style asset.');
				const blob = await response.blob();
				return new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result as string);
					reader.onerror = () => reject(new Error('Failed to read a PDF style asset.'));
					reader.readAsDataURL(blob);
				});
			});
			assets.set(url, asset);
		}
		return asset;
	};

	const embedCssAssets = async (css: string, baseUrl: string): Promise<string> => {
		const urls = [...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi)];
		const replacements = await Promise.all(
			urls.map(async (match) => {
				const url = match[1] ?? match[2] ?? match[3];
				if (!url || /^(data:|#)/i.test(url)) return match[0];
				const dataUrl = await embedAsset(new URL(url, baseUrl).href);
				return `url("${dataUrl}")`;
			}),
		);
		let index = 0;
		return css.replace(
			/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi,
			() => replacements[index++],
		);
	};

	const selector = 'style, link[rel~="stylesheet"]';
	const originals = [...doc.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(selector)];
	const copies = [...clone.querySelectorAll(selector)];
	await Promise.all(
		originals.map(async (element, index) => {
			const sheet = element.sheet;
			if (sheet?.disabled) {
				copies[index].remove();
				return;
			}
			let css: string;
			try {
				// Includes CSS injected by Vite and rules added through the CSSOM.
				if (!sheet) throw new Error('Stylesheet not loaded');
				css = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
			} catch {
				if (element.tagName === 'STYLE') {
					css = element.textContent ?? '';
				} else {
					const response = await fetch((element as HTMLLinkElement).href);
					if (!response.ok) throw new Error('Failed to load a PDF stylesheet.');
					css = await response.text();
				}
			}
			const style = doc.createElement('style');
			style.media = element.media;
			style.textContent = await embedCssAssets(css, sheet?.href ?? doc.baseURI);
			copies[index].replaceWith(style);
		}),
	);

	// Retain URL resolution for links and images, without restarting the app.
	clone
		.querySelectorAll('script, link[rel="modulepreload"], [data-export-overlay], base')
		.forEach((node) => node.remove());
	const base = doc.createElement('base');
	base.href = doc.baseURI;
	clone.querySelector('head')?.prepend(base);
	return `<!DOCTYPE html>${clone.outerHTML}`;
}
