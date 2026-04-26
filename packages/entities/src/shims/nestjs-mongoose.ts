// Browser shim for @nestjs/mongoose — decorators are no-ops in the browser.

const noop = () => () => {};

export const Prop = noop;
export const Schema = noop;
const schemaStub: Record<string, () => typeof schemaStub> = {};
const chainable = () => schemaStub;
['omit', 'pick', 'add', 'index', 'pre', 'post', 'plugin'].forEach(
	(k) => (schemaStub[k] = chainable),
);

export const SchemaFactory = {
	createForClass: () => schemaStub,
};
