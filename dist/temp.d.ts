export declare type RunnerResult<T> = T[] | {
    [key: string]: T;
};
export declare type RunnerCallback<T> = (err: Error | Error[], results: RunnerResult<T>) => void;
export declare type RunnerEvents = Function[] | {
    [key: string]: Function;
};
