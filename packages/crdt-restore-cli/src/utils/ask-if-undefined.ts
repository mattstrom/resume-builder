/**
 * Helper function for prompting the user with {@link question} only when {@link value} is undefined.
 * Optionally transforms the answer using {@link transform}.
 */
export async function askIfUndefined(
	value: string,
	question: () => Promise<string>,
): Promise<string>;
export async function askIfUndefined(
	value: boolean,
	question: () => Promise<boolean>,
): Promise<boolean>;
export async function askIfUndefined<T, R>(
	value: T,
	question: () => Promise<R>,
	transform: (value: R | undefined) => T,
): Promise<T>;
export async function askIfUndefined<T>(
	value: T,
	question: () => Promise<T>,
	transform?: (value: string | undefined) => T,
): Promise<T> {
	const answer = value === undefined ? await question() : value;

	if (transform) {
		return transform(answer as string);
	} else {
		return answer as T;
	}
}
