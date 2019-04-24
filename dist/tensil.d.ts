import { Express } from 'express';
import { Entity } from './entity';
import { IPolicies, IFilters, IRoutes, IActions, IRouters } from './types';
declare class Service extends Entity {
    filters: IFilters;
    routes: IRoutes;
    constructor();
    constructor(mount: string);
    constructor(name: string, mount: string);
}
declare class Controller extends Entity {
    policies: IPolicies;
    filters: IFilters;
    routes: IRoutes;
    actions: IActions;
    constructor();
    constructor(mount: string);
    constructor(name: string, mount: string);
}
export declare class Tensil extends Entity {
    static Service: typeof Service;
    static Controller: typeof Controller;
    constructor();
    constructor(app: Express);
    protected normalizeNamespaces(entity: Entity, context: 'policies' | 'filters' | 'routes'): void;
    protected lookupHandler(namespace: string, context: string): any;
    protected normalizeHandlers(handlers: any, context: string): Function[];
    protected normalizeEntity(entity: Entity): void;
    readonly routers: IRouters;
    normalize(): this;
    mount(): this;
    init(strict?: boolean): this;
}
export {};
