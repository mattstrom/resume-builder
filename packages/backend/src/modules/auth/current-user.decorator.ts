import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
	(data: string | undefined, context: ExecutionContext) => {
		let request: any;

		if (context.getType() === 'http') {
			request = context.switchToHttp().getRequest();
		} else {
			const ctx = GqlExecutionContext.create(context);
			request = ctx.getContext().req;
		}

		const user = request.user;
		return data ? user?.[data] : user;
	},
);
