import type { Format, TransformableInfo } from 'logform';
import { createLogger, format, transports } from 'winston';
import { type ConsoleTransportOptions } from 'winston/lib/winston/transports/index.js';

// TODO:
// import config from '~/config';

const config = {
	logLevel: 'debug',
};

const { combine, json } = format;

type Info = TransformableInfo & {
	context?: {
		user?: {
			sub?: string;
		};
	};
};

export const context: () => Format = format((info: Info) => {
	if (!info.context) {
		return info;
	}

	if (info.context.user?.sub) {
		info.user = info.context.user.sub;
	}

	delete info.context;

	return info;
});

const consoleOptions: ConsoleTransportOptions = {
	level: config.logLevel,
	handleExceptions: true,
};

export const logger = createLogger({
	transports: [new transports.Console(consoleOptions)],
	format: combine(context(), json()),
	exitOnError: false,
});
