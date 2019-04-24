import { Express, Router } from 'express';
import { Core } from './core';
import { Filter, Policy, Action, IFilters, IPolicies, IRoutes, IActions } from './types';
export declare class Entity {
    protected _type: string;
    protected _core: Core;
    protected policies: IPolicies;
    protected filters: IFilters;
    protected routes: IRoutes;
    protected actions: IActions;
    name: string;
    mountPath: string;
    constructor();
    constructor(name?: string, mount?: string, app?: Express);
    constructor(name?: string, mount?: string, type?: string, app?: Express);
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
