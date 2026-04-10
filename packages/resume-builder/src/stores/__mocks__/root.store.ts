export class RootStore {
	public inlineEditStore = {
		isEditing(path: string): boolean {
			return false;
		},
	};

	public inspectStore = {
		isInspectingMode: false,
		isHighlighted(): boolean {
			return false;
		},
	};

	public uiStateStore = {
		isResumeEditable: true,
	};

	static getInstance() {
		return new RootStore();
	}
}
