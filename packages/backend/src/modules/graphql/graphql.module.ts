import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import appRoot from 'app-root-path';
import { Logger } from 'winston';

import { LoggingModule } from '../logging/logging.module';
import { LoggingPlugin } from './logging.plugin';

@Module({
	imports: [
		NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
			imports: [LoggingModule],
			inject: [Logger],
			driver: ApolloDriver,
			useFactory: (logger: Logger) => ({
				autoSchemaFile: `${appRoot}/schema.gql`,
				playground: true,
				plugins: [new LoggingPlugin(logger)],
			}),
		}),
	],
})
export class GraphQLModule {}
