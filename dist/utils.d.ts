/**
 * Normalizes promise to return object containing { err, data }
 *
 * @param promise the promise to be wrapped.
 */
export declare const awaiter: <T>(promise: Promise<T>) => Promise<{
    err?: Error;
} & Record<"data", T>>;
/**
 * Parses out the caller from stack trace using an error.
 *
 * @param err the Error to be parsed.
 * @param split the index which to split stack trace at.
 */
export declare function parseCaller(err?: string | number | Error, split?: number): {
    name: string;
    message: string;
    source: string;
    function: any;
    filepath: any;
    filename: string;
    line: number;
    column: number;
    ministack: string;
    stack: string;
};
