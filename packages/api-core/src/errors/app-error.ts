import type { ContentfulStatusCode } from "hono/utils/http-status";

export type AppErrorOptions = {
  status: ContentfulStatusCode;
  error: string;
  code: string;
  message: string;
  details?: unknown;
};

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;

  constructor(opts: AppErrorOptions) {
    super(opts.message);
    this.name = "AppError";
    this.status = opts.status;
    this.error = opts.error;
    this.code = opts.code;
    this.details = opts.details;
  }
}
