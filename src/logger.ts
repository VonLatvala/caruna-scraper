import * as logfmt from 'logfmt';

export type LogfmtLogger = ReturnType<typeof logfmt.namespace>

export const logger: LogfmtLogger = logfmt.namespace({ app: "caruna-scraper" });
