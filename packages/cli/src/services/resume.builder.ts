interface Resume {}

export class ResumeBuilder {
	constructor() {}

	setName(name: string): this {
		return this;
	}

	build(): Resume {
		return {} as Resume;
	}
}
