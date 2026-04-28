export class HttpError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

export const badRequest = (msg: string, detail?: unknown) => new HttpError(400, msg, detail);
export const unauthorized = (msg = "unauthorized") => new HttpError(401, msg);
export const forbidden = (msg = "forbidden") => new HttpError(403, msg);
export const notFound = (msg = "not found") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
export const upstream = (msg: string, detail?: unknown) => new HttpError(502, msg, detail);
