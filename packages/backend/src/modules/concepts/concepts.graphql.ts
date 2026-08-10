import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * A free-text label matched to the concept it names.
 *
 * `broaderConceptIds` carries the ontology's parent chain so a caller holding a
 * set of required concepts can test coverage without walking the graph itself.
 */
@ObjectType()
export class ResolvedConceptLabelType {
	@Field()
	label: string;

	@Field(() => ID)
	conceptId: string;

	@Field(() => [ID])
	broaderConceptIds: string[];
}
