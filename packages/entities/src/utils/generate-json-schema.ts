import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { resumeSchema } from '../models/resume.js';

const outputPath = resolve(__dirname, '../../schemas/resume.schema.json');

const jsonSchema = resumeSchema.toJSONSchema();

writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + '\n');
console.log(`Written to ${outputPath}`);
