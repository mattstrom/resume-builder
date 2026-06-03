import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import appRoot from 'app-root-path';
import { Logger } from 'winston';

import { LoggingModule } from '../logging/logging.module.js';
import { LoggingPlugin } from './logging.plugin.js';

@Module({
	imports: [
		NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
			imports: [LoggingModule],
			inject: [Logger],
			driver: ApolloDriver,
			useFactory: (logger: Logger) => ({
				autoSchemaFile: `${appRoot}/schema.gql`,
				playground: true,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				plugins: [new LoggingPlugin(logger) as any],
			}),
		}),
	],
})
export class GraphQLModule {}
