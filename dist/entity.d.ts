import { Express, Router } from 'express';
import { Core } from './core';
import { Filter, Policy, Action, IFilters, IPolicies, IRoutes } from './types';
export declare class Entity {
    protected _core: Core;
    protected policies: IPolicies;
    protected filters: IFilters;
    protected routes: IRoutes;
    protected generate: boolean;
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
    policy(enabled?: boolean): this;
    policy(policies: IPolicies): this;
    policy(key?: string, policies?: Policy | Policy[], force?: boolean): any;
    filter(filters: IFilters): this;
    filter(key: string, filters: Filter | Filter[], force?: boolean): this;
    route(routes: IRoutes): this;
    route(route: string, actions: Filter | Filter[] | Action | Action[], force?: boolean): this;
}
