import { Express, Request, Response } from 'express';
import { Entity } from './entity';
import { IPolicies, IFilters, IRoutes, IRouters, EntityExtended, IEntities, Constructor, ContextTypes, RequestHandler } from './types';
export declare class Service extends Entity {
    filters: IFilters;
    routes: IRoutes;
    constructor();
    constructor(mount: string);
}
export declare class Controller extends Entity {
    generate: boolean;
    policies: IPolicies;
    filters: IFilters;
    routes: IRoutes;
    constructor(base: string, mount?: string);
}
export declare class Tensil<R extends Request, S extends Response> extends Entity {
    static Service: typeof Service;
    static Controller: typeof Controller;
    private _allowHandler;
    private _denyHandler;
    private _viewHandler;
    events: {
        [key: string]: ((...args: any[]) => void)[];
    };
    constructor();
    constructor(app: Express);
    protected normalizeNamespaces(entity: EntityExtended, context: ContextTypes): void;
    protected lookupHandler(namespace: string, context: ContextTypes): any;
    protected normalizeHandlers(handlers: any, context: ContextTypes, key: string): Function[];
    readonly entities: IEntities;
    readonly routers: IRouters;
    allowHandler: RequestHandler<R, S>;
    denyHandler: RequestHandler<R, S>;
    viewHandler: RequestHandler<R, S>;
    on(event: string, handler: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): void;
    off(event: string, handler: (...args: any[]) => void): this;
    removeEvents(event: string): void;
    entity<T extends Entity>(name: string): T;
    registerService<T extends Constructor>(Klass: T, mount?: string): this;
    registerController<T extends Constructor>(Klass: T, base: string, mount?: string): this;
    parseRoutes(route: string, handlers: any): void;
    initEntity(entity: EntityExtended, data: {
        filters: IFilters;
        routes: IRoutes;
        policies?: IPolicies;
    }): EntityExtended;
    normalizeEntity(entity: Service | Controller): Service | Controller;
    normalize(): this;
    mount(): this;
    init(isProduction?: boolean): this;
}
