import { createLogger, format, transports } from 'winston';

const { combine, json } = format;

export const logger = createLogger({
	transports: [new transports.Console()],
	format: combine(json()),
	exitOnError: false,
});
