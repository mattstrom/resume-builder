import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import appRoot from 'app-root-path';

@Module({
	imports: [
		NestGraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			autoSchemaFile: `${appRoot}/schema.gql`,
			playground: true,
		}),
	],
})
export class GraphQLModule {}
