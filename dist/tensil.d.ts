import { Express, Request, Response } from 'express';
import { Entity } from './entity';
import { IPolicies, IFilters, IRoutes, IRouters, IEntities, Constructor, ContextTypes, IActions, IOptions, IRouteMap } from './types';
export declare class Service<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {
    filters: IFilters;
    routes: IRoutes;
    constructor();
    constructor(mount: string);
}
export declare class Controller<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {
    policies: IPolicies;
    filters: IFilters;
    routes: IRoutes;
    actions: IActions;
    constructor(base: string, mount?: string);
}
export declare class Tensil<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {
    static Service: typeof Service;
    static Controller: typeof Controller;
    private _events;
    private _routeMap;
    options: IOptions;
    constructor();
    constructor(options: IOptions);
    constructor(app: Express, options?: IOptions);
    protected normalizeNamespaces(entity: Service | Controller, context: ContextTypes): void;
    protected lookupHandler(namespace: string): any;
    protected normalizeHandlers(handlers: any, context: ContextTypes, key?: string): Function[];
    readonly entities: IEntities;
    readonly routers: IRouters;
    readonly routeMap: IRouteMap;
    on(event: string, handler: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): void;
    off(event: string, handler: (...args: any[]) => void): this;
    removeEvents(event: string): void;
    getService<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P>;
    getController<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P>;
    registerService<T extends Constructor>(Klass: T, mount?: string): this;
    registerController<T extends Constructor>(Klass: T, base: string, mount?: string): this;
    parseRoute(route: string, base?: string): {
        methods: string[];
        path: string;
        fullPath: string;
    };
    registerRoute(mount: string, route: string, handlers: Function[], controller?: string): this;
    registerRoute(mount: string, base: string, route: string, handlers: Function[], controller?: string): this;
    initEntity(entity: Service | Controller, contexts: {
        filters: IFilters;
        routes: IRoutes;
        policies?: IPolicies;
        actions?: IActions;
    }): Service<Request, Response> | Controller<Request, Response>;
    normalizeEntity(entity: Service | Controller): Service<Request, Response> | Controller<Request, Response>;
    normalize(): this;
    mount(): this;
    init(strict?: boolean): this;
}
