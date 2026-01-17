import {
	PipeTransform,
	Injectable,
	ArgumentMetadata,
	BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ObjectIdPipe implements PipeTransform {
	transform(value: unknown, metadata: ArgumentMetadata) {
		if (typeof value !== 'string') {
			throw new BadRequestException('Invalid id');
		}

		return new Types.ObjectId(value);
	}
}
