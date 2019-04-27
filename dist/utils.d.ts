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
