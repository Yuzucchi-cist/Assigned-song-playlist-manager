export type Result<T, E=unknown> =
    | { ok: true; value: T}
    | { ok: false; error: E};

export type AsyncResult<T, E=unknown> = Promise<Result<T, E>>;