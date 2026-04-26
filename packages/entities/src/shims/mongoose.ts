// Browser shim for mongoose — decorators/types are no-ops in the browser.

const noop = async () => {};

class ObjectIdStub {
	constructor(_id?: unknown) {}
}

export const Types = { ObjectId: ObjectIdStub };

export type HydratedDocument<T> = T;
export type Mongoose = object;

export default {
	Types,
	connect: noop,
	disconnect: noop,
};
