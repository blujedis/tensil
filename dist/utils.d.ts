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
