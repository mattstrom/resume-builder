import { Args, Query, Resolver } from '@nestjs/graphql';

import { ResolvedConceptLabelType } from './concepts.graphql.js';
import { ConceptsService } from './concepts.service.js';

@Resolver(() => ResolvedConceptLabelType)
export class ConceptsResolver {
	constructor(private readonly conceptsService: ConceptsService) {}

	/**
	 * Matches free-text labels — skills, skill-group items, project technologies —
	 * to the concepts they name.
	 *
	 * Resolution is alias- and ontology-aware, which string comparison in the
	 * client never was: `k8s` reaches `Kubernetes`, and the result carries the
	 * parent chain so a leaf skill can answer a broader requirement. Labels that
	 * match nothing are simply absent from the result.
	 *
	 * Not user-scoped, because the concept graph is not: `Concept` is unique on
	 * (vocabulary, key) with no owner, and ids alone carry no user content.
	 */
	@Query(() => [ResolvedConceptLabelType])
	async resolveConceptLabels(
		@Args('labels', { type: () => [String] }) labels: string[],
	): Promise<ResolvedConceptLabelType[]> {
		return this.conceptsService.resolveLabelConcepts(labels);
	}
}
