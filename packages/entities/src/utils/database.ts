import mongoose, { Mongoose } from 'mongoose';

interface MongooseConnectionOptions {
	url?: string;
	dbName?: string;
}

interface DisposableConnection extends AsyncDisposable {
	connection: Mongoose;
}

/**
 * Creates an async disposable Mongoose connection.
 *
 * Usage:
 * ```ts
 * await using db = await connectMongoose({ url: 'mongodb://localhost:27017', dbName: 'mydb' });
 * // Use db.connection for operations
 * // Connection automatically closes when scope exits
 * ```
 */
export async function connectMongoose(
	options: MongooseConnectionOptions,
): Promise<DisposableConnection> {
	const url = options.url ?? 'mongodb://localhost:27017';
	const dbName = options.dbName ?? 'resume-builder';

	const connection = await mongoose.connect(url, { dbName });

	return {
		connection,
		async [Symbol.asyncDispose]() {
			await mongoose.disconnect();
		},
	};
}
