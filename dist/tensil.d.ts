/// <reference types="node" />
import { Express, Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { Entity } from './entity';
import { IPolicies, IFilters, IRoutes, IRouters, IEntities, Policy, Constructor, ContextTypes, IActions, IOptions, IRouteMap, Noop, IConfig } from './types';
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
    /**
     * Sets global policy for Controller.
     *
     * @example
     * .policy(false);
     *
     * @param enabled boolean indicating allow or deny for Controller.
     */
    policy(enabled?: boolean): this;
    /**
     * Merges policies with the provided object.
     *
     * @example
     * .policy({
     *   find: ['isAuthorized']
     * });
     *
     * @param policies the policy collection object.
     */
    policy(policies: IPolicies): this;
    /**
     * Adds policy to collection.
     *
     * @example
     * .policy('find', 'isAuthorized');
     * .policy('find', 'isAuthorized', true);
     *
     * @param key the policy's key.
     * @param policies the policy or array of policies.
     * @param force when true overwrites existing.
     */
    policy(key?: string, policies?: Policy | Policy[], force?: boolean): any;
}
export declare class Tensil<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {
    static Service: typeof Service;
    static Controller: typeof Controller;
    private _initialized;
    private _normalized;
    private _events;
    private _routeMap;
    options: IOptions;
    server: HttpServer | HttpsServer;
    constructor();
    constructor(options: IOptions);
    constructor(app: Express, options?: IOptions);
    /**
     * Normalizes namespaces for lookups.
     *
     * @param entity the Service or Controller to normalize.
     * @param context the context to normalize in
     */
    protected normalizeNamespaces(entity: Service | Controller, context: ContextTypes): void;
    /**
     * Looks up namespace within a given Entity.
     *
     * @example
     * .lookupHandler('UserController.find');
     *
     * @param namespace the namespace to be looked up.
     */
    protected lookupHandler(namespace: string): any;
    /**
     * Iterates a context normalizing all handlers looking up handler when required.
     *
     * @example
     * .normalizeHandlers(['CommonService.log', (req, res, next) => next], 'filters', 'isAuthorized');
     *
     * @param handlers an array containing handlers to be looked up when string.
     * @param context the context to look up.
     * @param key the property key within the context.
     */
    protected normalizeHandlers(handlers: any, context: ContextTypes, key?: string): Function[];
    readonly entities: IEntities;
    readonly routers: IRouters;
    readonly routeMap: IRouteMap;
    /**
     * Binds event listener to event.
     *
     * @example
     * .on('start', () => { console.log('server started'); });
     *
     * @param event the event to listen on.
     * @param handler the handler to be called on emit.
     */
    on(event: string, handler: (...args: any[]) => void): this;
    /**
     * Emits events by name.
     *
     * @example
     * .emit('register', SomeEntity);
     *
     * @param event the event to be emitted.
     * @param args the arguments to be passed to the handler.
     */
    emit(event: string, ...args: any[]): void;
    /**
     * Disables an event removing it from the collection.
     *
     * @example
     * .off('register', (entity: Entity) => {});
     *
     * @param event the event to be disabled.
     * @param handler the handler within event collection to be removed.
     */
    off(event: string, handler: (...args: any[]) => void): this;
    /**
     * Removes all handlers for the specified event.
     *
     * @example
     * .removeEvents('register');
     *
     * @param event the event name to remove handlers for.
     */
    removeEvents(event: string): void;
    /**
     * Gets a Service by name.
     *
     * @example
     * .getService('LogService');
     * .getService<Request, Response>('LogService');
     *
     * @param name the name of the Service to get.
     */
    getService<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P>;
    /**
     * Gets a Controller by name.
     *
     * @example
     * .getController('UserController');
     * .getController<Request, Response>('LogService');
     *
     * @param name the name of the Controller to get.
     */
    getController<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P>;
    /**
     * Registers a Service with Tensil.
     *
     * @example
     * .registerService(LogService);
     * .registerService(LogService, '/log');
     *
     * @param Klass the Service class to be registered.
     * @param mount the optional router mount point to use.
     */
    registerService<T extends Constructor>(Klass: T, mount?: string): this;
    /**
     * Registers a Controller with Tensil.
     *
     * @example
     * .registerController(UserController, 'user');
     * .registerController(UserController, 'user', '/identity');
     *
     * @param Klass the Controller class to be registered.
     * @param mount the optional router mount point to use.
     */
    registerController<T extends Constructor>(Klass: T, base: string, mount?: string): this;
    /**
     * Parses a route returning config object.
     *
     * @example
     * .parseRoute('get /user');
     * .parseRoute('get|put /user/:id?');
     * .parseRoute('get /user', '/identity');
     *
     * @param route the route to parse for methods and path.
     * @param base a base path to be prefixed to route.
     */
    parseRoute(route: string, base?: string): {
        methods: string[];
        path: string;
        fullPath: string;
    };
    /**
     * Registers a route with the routeMap.
     *
     * @example
     * .registerRoute('/identity', 'get /user/:id?', []);
     * .registerRoute('/identity', 'get /user/:id?', [], 'UserController');
     *
     * @param mount the router mount point to be registered
     * @param route the route to be parsed and registerd.
     * @param handlers the handlers to be bound to route.
     * @param controller optional Controller name when generating routes.
     */
    registerRoute(mount: string, route: string, handlers: Function[], controller?: string): this;
    /**
     * Registers a route with the routeMap.
     *
     * @example
     * .registerRoute('/identity', 'user', 'get /:id?', []);
     * .registerRoute('/identity', '/user', 'get /:id?', [], 'UserController');
     *
     * @param mount the router mount point to be registered
     * @param base the base path to prefix to the route.
     * @param route the route to be parsed and registerd.
     * @param handlers the handlers to be bound to route.
     * @param controller optional Controller name when generating routes.
     */
    registerRoute(mount: string, base: string, route: string, handlers: Function[], controller?: string): this;
    /**
     * Configures constructed class merging in initialized data from decorators.
     *
     * @param entity the Service or Controller to configure init data for.
     * @param contexts the configuration contexts to merge/init data for.
     */
    configure(entity: Service | Controller, contexts: IConfig): Service<Request, Response> | Controller<Request, Response>;
    /**
     * Iterates configuration contexts normalizing them for the purpose of building routes.
     *
     * @example
     * .normalizeEntity(UserController);
     *
     * @param entity the Service or Controller to be normalized.
     */
    normalizeEntity(entity: Service | Controller): Service<Request, Response> | Controller<Request, Response>;
    /**
     * Iterates each entity, loads init data then normalizes.
     *
     * @example
     * .normalize();
     */
    normalize(): this;
    /**
     * When no server is specified uses internal Express app.
     *
     * @example
     * import { createServer } from 'http';
     * import * as express from 'express';
     * const app = express();
     * const server = createServer(app);
     *
     * @param server the server to use for listening to requests.
     */
    bindServer(server?: HttpServer | HttpsServer): this;
    /**
     * Mounts the routes from the generated routeMap to their respective routers.
     *
     * @example
     * .mount();
     */
    mount(): this;
    /**
     * Initializes Tensil ensuring Server, normalizing routes, mounting routes.
     *
     * @example
     * .init();
     */
    init(): this;
    /**
     * Starts the server after initializing, normalizing and mounting routes.
     *
     * @example
     * .start();
     */
    start(): this;
    /**
     * Starts the server after initializing, normalizing and mounting routes.
     *
     * @example
     * .start(8080, () => { console.log('listening...')});
     *
     * @param port the port the server should listen on.
     * @param fn a callback on server listening.
     */
    start(port: number, fn: () => void): this;
    /**
     * Starts the server after initializing, normalizing and mounting routes.
     *
     * @example
     * .start(8080, '10.0.0.1', () => { console.log('listening...')});
     *
     * @param port the port the server should listen on.
     * @param host the host the server should listen on (default: 3000)
     * @param fn a callback on server listening.
     */
    start(port: number, host: string, fn: Noop): this;
}
