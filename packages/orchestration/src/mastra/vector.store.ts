import { MongoDBVector } from '@mastra/mongodb';

export const vectorStore = new MongoDBVector({
	id: 'mongodb-vector',
	uri: 'mongodb://localhost:27017/resume-builder',
	dbName: 'vector-store',
});
