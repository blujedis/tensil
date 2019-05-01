/// <reference types="node" />
import { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { ServeStaticOptions } from 'serve-static';
import { Server as HttpServer, ServerOptions as HttpServerOptions } from 'http';
import { Server as HttpsServer, ServerOptions as HttpsServerOptions } from 'https';
import { Entity } from './entity';
import { IPolicies, IFilters, IRoutes, IRouters, IEntities, Policy, Constructor, ContextTypes, IActions, IOptions, IRouteMap, Noop, IConfig, ContextHandlers } from './types';
declare class Service extends Entity {
    filters: IFilters;
    routes: IRoutes;
    constructor();
    constructor(mount: string);
}
declare class Controller extends Entity {
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
declare class Tensil extends Entity {
    private _initialized;
    private _normalized;
    private _routeMap;
    protected _options: IOptions;
    server: HttpServer | HttpsServer;
    port: number;
    host: string;
    constructor();
    constructor(options: IOptions);
    constructor(app: Express, options?: IOptions);
    protected wrapContext(entity: any, fn: any): () => any;
    /**
     * Creates transform to be used with ReadStream.
     *
     * @example
     * res.write('<!-- BEGIN WRITE -->') // optional
     * createReadStream('/path/to.html')
     *  .pipe(.transformContext({}))
     *  .on('end', () => res.write('<!-- END WRITE -->'))
     *  .pipe(res);
     *
     * @param context the context object to render to string template.
     */
    protected transformContext(context: any): void;
    /**
     * Clone an error into plain object.
     *
     * @param err the error to be cloned.
     */
    protected cloneError<T extends Error = Error>(err: T, pick?: string | string[]): T;
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
    protected normalizeHandlers<R extends Request = Request, S extends Response = Response>(handlers: any, context: ContextTypes, key?: string): ContextHandlers<R, S>[];
    options: IOptions;
    readonly entities: IEntities;
    readonly routers: IRouters;
    readonly routeMap: IRouteMap<Request, Response>;
    readonly isProd: boolean;
    readonly isDev: boolean;
    /**
     * Checks if process.env.NODE_ENV contains specified environment.
     *
     * @param env the environment to inspect process.env.NODE_ENV for.
     */
    isEnv(env: string): boolean;
    /**
     * Checks if Request is of type XHR.
     *
     * @param req Express Request
     */
    isXHR(req: Request): string | boolean;
    /**
     * Synchronously checks if a view exists.
     *
     * @example
     * .isView('user/profile');
     *
     * @param view the view to check if exists.
     */
    isView(view: string, sync: boolean): boolean;
    /**
     * Asynchronously checks if a view exists.
     *
     * @example
     * const isFile = await .isView('user/profile');
     *
     * @param view the view to check if exists.
     */
    isView(view: string): Promise<boolean>;
    /**
     * Require Xhr requests.
     *
     * @param status the Http status code.
     */
    demandXhr(status?: number): RequestHandler;
    /**
     * Rejects Xhr requests.
     *
     * @param text the Http status text (default: Not Acceptable).
     * @param view optional filename to be rendered (default: 'dist/views/error.html')
     */
    demandXhr(text: string, view: string): RequestHandler;
    /**
     * Rejects Xhr requests.
     *
     * @param status the Http status code.
     * @param text the Http status message (default: Not Acceptable).
     * @param view optional filename to be rendered (default: 'dist/views/error.html')
     */
    demandXhr(status: number, text: string, view?: string): RequestHandler;
    /**
     * Rejects Xhr requests.
     *
     * @param status the Http status code.
     */
    rejectXhr(status?: number): RequestHandler;
    /**
     * Rejects Xhr requests.
     *
     * @param text the Http status message (default: Not Acceptable).
     */
    rejectXhr(text: string): RequestHandler;
    /**
     * Rejects Xhr requests.
     *
     * @param status the Http status code.
     * @param text the Http status message (default: Not Acceptable).
     */
    rejectXhr(status: number, text: string): RequestHandler;
    /**
     * Default deny handler.
     *
     * @example
     * .deny();
     */
    deny(): RequestHandler;
    /**
     * Default deny handler.
     *
     * @example
     * .deny('Access denied');
     * .deny('Access denied', '/path/to/file.html')
     *
     * @param text the message to be sent (default: Access denied).
     * @param filename optional filename to render (default: 'dist/views/error.html')
     */
    deny(text: string, filename: string): RequestHandler;
    /**
     * Default deny handler.
     *
     * @example
     * .deny(403, 'Access denied');
     *
     * @param status the Http status code to use (default: 403).
     * @param text the message to be sent (default: Access denied).
     * @param filename optional view/filename to render (default: 'dist/views/error.html')
     */
    deny(status: number, text?: string): RequestHandler;
    /**
     * Returns default handler for rendering a view.
     *
     * @example
     * .view('user/create');
     * .view('user/create', { });
     *
     * @param view the path of the view.
     * @param context the context to pass to the view.
     */
    view<T extends object = any>(view: string, context?: T): (req: Request, res: Response) => void;
    /**
     * Returns default redirect handler.
     *
     * @example
     * .redirect('/to/some/new/path');
     *
     * @param to the path to redirect to.
     */
    redirect(to: string): (req: Request, res: Response) => void;
    /**
     * Binds static path for resolving static content (images, styles etc)
     *
     * @example
     * app.use('./public', {  });
     * app.use('./public', true);
     * app.use('./public', {}, true);
     *
     * @param path the path to the directory for static content.
     * @param options any ServeStaticOptions to be applied.
     * @param bind when true same as calling app.use(express.static('./public)).
     */
    static(path: string, options?: ServeStaticOptions | boolean, bind?: boolean): import("express-serve-static-core").Handler;
    /**
     * Enables 404 Error handling.
     *
     * @example
     * .notFound('Custom 404 error message');
     * .notFound('Custom 404 error message', '/path/to/file.html');
     * .notFound(null, '/path/to/file.html');
     *
     * @param text method to be displayed on 404 error.
     * @param view optional view/filename to render (default: 'dist/views/error.html')
     */
    notFound(text?: string, view?: string): (req: Request, res: Response, next: NextFunction) => Promise<void | import("express-serve-static-core").Response>;
    /**
     * Creates 500 Error handler.
     * NOTE: if next(err) and err contains status/statusText it will be used instead.
     *
     * @example
     * .serverError();
     * .serverError('Server Error', '/some/path/to/error.html');
     * .serverError(null, '/some/path/to/error.html');
     *
     * @param text the Server Error status text.
     * @param view optional view/filename (default: /tensil/dist/views/error.html)
     */
    serverError(text?: string, view?: string): ErrorRequestHandler;
    /**
     * Renders Express view or static html file.
     *
     * @param req the Express Request handler.
     * @param res the Express Response handler.
     * @param next the Express Next Function handler.
     */
    renderFileOrView(req: Request, res: Response, next?: NextFunction): (view: string, context?: any, status?: number) => Promise<void>;
    /**
     * Gets the base class type for a given class.
     *
     * @param Type the type to inspect for base type.
     */
    getType(Type: Entity): any;
    /**
     * Gets a Service by name.
     *
     * @example
     * .getService('LogService');
     * .getService('LogService');
     *
     * @param name the name of the Service to get.
     */
    getService(name: string): Service;
    /**
     * Gets a Controller by name.
     *
     * @example
     * .getController('UserController');
     * .getController('LogService');
     *
     * @param name the name of the Controller to get.
     */
    getController(name: string): Service;
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
    parseRoute<R extends Request = Request, S extends Response = Response>(route: string, base?: string): {
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
     * @param entity entity type name.
     */
    protected registerRoute<R extends Request = Request, S extends Response = Response>(mount: string, route: string, handlers: ContextHandlers<R, S>[], entity?: string): this;
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
     * @param entity entity type name.
     * @param isGenerated when true registering a generated route.
     */
    protected registerRoute<R extends Request = Request, S extends Response = Response>(mount: string, base: string, route: string, handlers: ContextHandlers<R, S>[], entity?: string, isGenerated?: boolean): this;
    /**
     * Configures constructed class merging in initialized data from decorators.
     *
     * @param entity the Service or Controller to configure init data for.
     * @param contexts the configuration contexts to merge/init data for.
     */
    configure(entity: Service | Controller, contexts: IConfig): Service | Controller;
    /**
     * Iterates configuration contexts normalizing them for the purpose of building routes.
     *
     * @example
     * .normalizeEntity(UserController);
     *
     * @param entity the Service or Controller to be normalized.
     */
    normalizeEntity(entity: Service | Controller): Service | Controller;
    /**
     * Iterates each entity, loads init data then normalizes.
     *
     * @example
     * .normalize();
     */
    normalize(): this;
    /**
     * Creates an Http Server with specified and options.
     *
     * @example
     * .withServer();
     */
    withServer(): HttpServer;
    /**
     * Creates an Http Server with specified and options.
     *
     * @example
     * .withServer(tensil.app, {});
     *
     * @param options the Http Server options to apply on create.
     */
    withServer(options?: HttpServerOptions): HttpServer;
    /**
     * Creates an Http Server with specified options.
     *
     * @example
     * .withServer({}, true);
     *
     * @param options the Https server options.
     * @param isSSL indicates an Https server is being created.
     */
    withServer(options: HttpsServerOptions, isSSL: boolean): HttpsServer;
    /**
     * Creates an Http Server with specified app and options.
     *
     * @example
     * .withServer(app);
     * .withServer(tensil.app, {});
     *
     * @param app an Express app to bind to the server.
     * @param options the Http Server options to apply on create.
     */
    withServer(app: Express, options?: HttpServerOptions): HttpServer;
    /**
     * Creates an Http Server with specified app and options.
     *
     * @example
     * .withServer(tensil.app, {}, true);
     *
     * @param app the Express app to bind to the server.
     * @param options the Https server options.
     * @param isSSL indicates an Https server is being created.
     */
    withServer(app: Express, options: HttpsServerOptions, isSSL: boolean): HttpsServer;
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
     * .start(() => { console.log('listening...')});
     *
     * @param fn a callback on server listening.
     */
    start(fn: () => void): this;
    /**
     * Starts the server after initializing, normalizing and mounting routes.
     *
     * @example
     * .start(8080, () => { console.log('listening...')});
     *
     * @param port the port the server should listen on.
     * @param fn a callback on server listening.
     */
    start(port: number, fn?: () => void): this;
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
    start(port: number, host: string, fn?: Noop): this;
}
export { Tensil, Service, Controller };
declare const _default: Tensil;
export default _default;
