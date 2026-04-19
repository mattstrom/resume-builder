export function formatKey(key: string): string {
	return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
