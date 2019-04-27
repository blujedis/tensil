import { Express, Router } from 'express';
import { Core } from './core';
import { Filter, Policy, Action, IFilters, IPolicies, IRoutes, IActions } from './types';
import { Request, Response } from 'express-serve-static-core';
export declare class Entity<R extends Request, S extends Response> {
    protected _core: Core;
    protected policies: IPolicies;
    protected filters: IFilters;
    protected routes: IRoutes;
    protected actions: IActions;
    type: string;
    baseType: string;
    mountPath: string;
    basePath: string;
    constructor();
    constructor(base: string, mount?: string, app?: Express);
    private readonly tensil;
    private validateKey;
    readonly app: Express;
    readonly router: Router;
    deny(req: R, res: S): Response;
    view<T extends object = any>(path: string, context?: T): (req: R, res: S) => void;
    redirect(to: string): (req: R, res: S) => void;
    policy(enabled?: boolean): this;
    policy(policies: IPolicies): this;
    policy(key?: string, policies?: Policy | Policy[], force?: boolean): any;
    filter(filters: IFilters): this;
    filter(key: string, filters: Filter | Filter[], force?: boolean): this;
    route(routes: IRoutes): this;
    route(route: string, actions: Filter | Filter[] | Action | Action[], force?: boolean): this;
}
