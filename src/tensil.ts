import {
  Express, Request, Response, static as createStatic, NextFunction, RequestHandler,
  ErrorRequestHandler
} from 'express';
import { Transform } from 'stream';
import { ServeStaticOptions } from 'serve-static';
import { Server as HttpServer, createServer as createHttpServer, ServerOptions as HttpServerOptions } from 'http';
import { Server as HttpsServer, createServer as createHttpsServer, ServerOptions as HttpsServerOptions } from 'https';
import { Entity } from './entity';
import {
  isBoolean, get, set, has, isString, isFunction, castArray, isObject, isUndefined,
  uniq, includes, templateSettings, template, isPlainObject, isEmpty
} from 'lodash';
import { STATUS_CODES } from 'statuses';
import { join, resolve } from 'path';
import { stat, statSync, readFile } from 'fs';
import {
  IPolicies, IFilters, IRoutes, IRouters, IEntities, Policy,
  Constructor, EntityType, ContextType, ContextTypes, HttpError,
  IActions, HttpMethod, IOptions, IRouteMap, Noop, IConfig, RequestHandlers,
  ContextHandlers, IGenerateRouteConfig, RouteType, IGenerateActionConfig, DecoratorType, Filter, Action
} from './types';
import { awaiter } from './utils';

templateSettings.interpolate = /{{([\s\S]+?)}}/g;

const BASE_DIR = join(__dirname, '../');
const ERROR_VIEW = join(BASE_DIR, 'dist/views/error.html');

const DEFAULT_OPTIONS: IOptions = {

  templates: {
    get: '/{{key}}',
    put: '/{{key}}/:id?',
    post: '/{{key}}',
    read: '/{{key}}/:id?',
    create: '/{{key}}',
    update: '/{{key}}/:id?',
    patch: '/{{key}}/:id',
    delete: '/{{key}}/:id?',
  },

  rest: true,
  crud: false,
  sort: true,
  strict: undefined,

  formatter: (type: RouteType, tplt: string, props: Partial<IGenerateActionConfig>) => {
    if (type === RouteType.Rest)
      props.key = '';
    const compiled = template(tplt)(props);
    return compiled.replace(/\/\//g, '/');
  },

  themes: {
    500: { primary: '#661717', accent: '#dd0d2c' },
    406: { primary: '#6d0227', accent: '#c10043' },
    404: { primary: '#1E152A', accent: '#444c99' },
    403: { primary: '#661717', accent: '#dd0d2c' },
    401: { primary: '#661717', accent: '#dd0d2c' },
    400: { primary: '#ad3826', accent: '#f95036' },
  }

};

class Service extends Entity {

  static __BASE_TYPE__ = 'Service';

  filters: IFilters;
  routes: IRoutes;

  constructor();
  constructor(mount: string);
  constructor(mount?: string) {
    super(undefined, mount);
  }

  protected get getType() {
    return Service.__BASE_TYPE__;
  }

}

class Controller extends Entity {

  static __BASE_TYPE__ = 'Controller';

  policies: IPolicies;
  filters: IFilters;
  routes: IRoutes;
  actions: IActions;

  constructor(base: string, mount?: string) {
    super(base, mount);
  }

  protected get getType() {
    return Controller.__BASE_TYPE__;
  }

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
  policy(key?: string, policies?: Policy | Policy[], force?: boolean);
  policy(key?: string | boolean | IPolicies, policies?: Policy | Policy[], force: boolean = false) {

    if (isObject(key)) {
      this.policies = { ...key };
      this.emitter('policy', 'create', this.policies);
      return this;
    }

    if (isBoolean(key)) {
      policies = key;
      key = '*';
    }

    policies = castArray(policies) as Policy[];
    const validKey = this.validateKey(key, 'policies', force);

    if (!validKey) {
      this.emitter('policy', 'invalid', new Error(`Policy key "${key}" exists set force to true to overwrite`));
      return this;
    }

    this.policies = this.policies || {};
    this.policies[validKey] = policies;

    this.emitter('policy', 'create', { [validKey]: policies });

    return this;

  }

}

class Tensil extends Entity {

  static __BASE_TYPE__ = 'Tensil';

  private _initialized = false;
  private _normalized = false;
  private _routeMap: IRouteMap = {};
  protected _options: IOptions;

  server: HttpServer | HttpsServer;
  port: number;
  host: string;

  constructor()
  constructor(options: IOptions)
  constructor(app: Express, options?: IOptions)
  constructor(app?: Express | IOptions, options?: IOptions) {
    super(undefined, undefined, (isFunction(app) && app) as Express);
    if (isObject(app)) {
      options = app as IOptions;
      app = undefined;
    }
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // PRIVATE & PROTECTED // 

  protected get getType() {
    return Tensil.__BASE_TYPE__;
  }

  /**
   * Binds the context to a looked up handler method.
   * 
   * @param entity the entity context to be bound to function.
   * @param fn the function whose context should be bound to entity.
   */
  protected wrapContext(entity, fn) {
    return function () {
      const args = [].slice.call(arguments);
      try {
        return fn.apply(entity, args);
      }
      catch (ex) {
        const next = args[args.length - 1];
        if (isFunction(next))
          return next(ex);
        // As last resort throw the error.
        throw ex;
      }
    };
  }

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
  protected transformContext(context: any) {
    const transformer = new Transform();
    transformer._transform = (data, enc, done) => {
      transformer.push(template(data.toString())(context));
      done();
    };
  }

  /**
   * Clone an error into plain object.
   * 
   * @param err the error to be cloned.
   */
  protected cloneError<T extends Error = Error>(err: T, pick?: string | string[]) {
    pick = castArray(pick);
    return Object.getOwnPropertyNames(err)
      .reduce((a, c) => {
        if (~pick.indexOf(c))
          return a;
        if (!a.name)
          a.name = err.name;
        a[c] = err[c];
        return a;
      }, {} as T);
  }

  /**
   * Converts entity type or entity with key property to namespace.
   * 
   * @example
   * .toNamespace(UserController, 'create');
   * .toNamespace('UserController', 'create');
   * 
   * @param entity an entity type name or entity.
   * @param key the key to be joined to namespace.
   */
  protected toNamespace(entity: Service | Controller | string, key: string) {
    if (!isString(entity))
      entity = (entity as Controller).type;
    return `${entity}.${key}`;
  }

  /**
   * Takes a namespaces and converts to key value of entity or entity type and key.
   * 
   * @example
   * .fromNamespace('UserController.create');
   * .fromNamespace('UserController.create', true);
   * 
   * @param namespace the namspace to be split to entity and key.
   * @param asEntity when true returns an entity instead of entity type.
   */
  protected fromNamespace<T extends Entity = Entity>(namespace: string, asEntity?: boolean) {
    const parts = namespace.split('.');
    if (asEntity)
      return {
        entity: this.entities[parts[0]] as T,
        key: parts[1]
      };
    return {
      entity: parts[0],
      key: parts[1]
    };
  }

  /**
   * Normalizes namespaces for lookups.
   * 
   * @param entity the Service or Controller to normalize.
   * @param context the context to normalize in
   */
  protected normalizeNamespaces(entity: Service | Controller, context: ContextTypes) {

    const map = entity[context];
    const entityType = entity.type;

    for (const k in map) {

      // When handler is a string and 
      // method type is view or redirect
      // we don't want to process the string.
      const ignore = includes(['view', 'redirect'], k.split(' ').shift());

      // Ensure is an array if not bool.
      if (!isBoolean(map[k])) {

        const arr = castArray(map[k]);

        map[k] = arr.reduce((a, c, i) => {

          if (isString(c)) {

            if (ignore && (arr.length - 1 === i)) {
              c = [c, {}];
            }

            else {

              // When string normalize the namespace.
              const parts = c.split('.');

              // If a local lookup and starts with context
              // prepend "this" so the type name is looked up.
              if (parts[0] === context)
                parts.unshift('this');

              if (parts.length === 1 || parts[0] === 'this') {

                if (parts[0] === 'this')
                  parts.shift();

                c = [entityType, ...parts].join('.');

              }
            }

          }

          return [...a, c];

        }, []);

      }

    }

  }

  /**
   * Looks up namespace within a given Entity.
   * 
   * @example
   * .lookupHandler('UserController.find');
   * 
   * @param namespace the namespace to be looked up.
   */
  protected lookupHandler(namespace: string) {

    const entities = this.core.entities;

    const parts = namespace.split('.');
    const entityType = parts.shift() || '';
    const entity = entities[entityType] as (Service | Controller);

    // Ensure entity exists.
    if (!entity)
      throw new Error(`Entity ${entityType || 'undefined'} is required but could not be found`);

    let result;

    // If no result fallback check if class contains handler.
    result = get(entity, parts.join('.'));

    // Since this was looked up bind the context.
    if (result && isFunction(result)) {
      result = this.wrapContext(entity, result);
      // Store the namespace
      result.__namespace__ = namespace;
    }

    return result;

  }

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
  protected normalizeHandlers<R extends Request = Request, S extends Response = Response>(
    handlers: any, context: ContextTypes, key?: string): ContextHandlers<R, S>[] {

    return castArray(handlers || []).reduce((result, handler) => {

      // Lookup the filter.
      if (isString(handler)) {

        const lookup = this.lookupHandler(handler);

        if (!lookup)
          throw new Error(`${handler} filter is required but could not be found`);

        // Recurse ensure all handlers in lookup filter.
        const normalized = this.normalizeHandlers(lookup, context, key);

        result = [...result, ...normalized];

      }

      else if (isBoolean(handler)) {

        // Only policies can contain boolean handlers.
        if (context !== ContextType.policies)
          throw new Error(`${context.charAt(0).toUpperCase() +
            context.slice(1)} "${key || 'unknown'}" cannot contain boolean handler.`);

        result = (handler === true) ? [] : this.deny() || [];

      }

      // Is view/redirect
      else if (Array.isArray(handler)) {

        const parts = key.toLowerCase().split(' ');

        if (includes(['view', 'redirect'], parts[0])) {

          const actionHandler = this[parts[0]];
          const args = [handler[0].replace(/^\//, '')];
          if (parts[0] === 'view')
            args.push(handler[1] || {});

          handler = actionHandler(...args);

        }

        result = [...result, handler];

      }

      else {
        result = [...result, handler];
      }

      return result;

    }, []);

  }

  // GETTERS //

  get options() {
    return this._options;
  }

  set options(options: IOptions) {
    this._options = options;
  }

  get routers(): IRouters {
    return this.core.routers;
  }

  get routeMap() {
    return this._routeMap;
  }

  get isProd() {
    return this.isEnv('production');
  }

  get isDev() {
    return this.isEnv('') || !this.isEnv('production');
  }

  // HELPERS //

  /**
   * Checks if process.env.NODE_ENV contains specified environment.
   * 
   * @param env the environment to inspect process.env.NODE_ENV for.
   */
  isEnv(env: string) {
    return process.env.NODE_ENV === env;
  }

  /**
   * Checks if Request is of type XHR.
   * 
   * @param req Express Request
   */
  isXHR(req: Request) {
    return req.xhr || req.accepts(['json']) || req.get('X-Requested-With') || req.is('*/json') ||
      (req.headers && req.headers.accept && ~req.headers.accept.indexOf('json'));
  }

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
  async isView(view: string): Promise<boolean>;
  isView(view: string, sync?: boolean): boolean | Promise<boolean> {

    const dir = this.app.get('views');
    const engine = this.app.get('view engine');
    const filename = resolve(dir, view);

    if (sync) {
      if (!engine)
        return false;
      const stats = statSync(filename);
      return stats.isFile();
    }

    return new Promise((_resolve, _reject) => {
      if (!engine)
        return _resolve(false);
      stat(filename, (err, stats) => {
        if (err)
          return _reject(err);
        _resolve(stats.isFile());
      });

    });

  }

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
  demandXhr(status?: number | string, text?: string, view?: string) {

    if (isString(status)) {
      view = text;
      text = status;
      status = undefined;
    }

    status = status || 406;
    text = text || STATUS_CODES[status];
    view = view || ERROR_VIEW;
    const theme = this.options.themes[status];

    const err = new HttpError(text, status as number, text, theme);
    const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);

    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.isXHR(req))
        return this.renderFileOrView(req, res, next)(view, payload, status as number);
      next();
    };

  }

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
  rejectXhr(status: number | string, text?: string) {

    if (isString(status)) {
      text = status;
      status = undefined;
    }

    status = status || 406;
    text = text || STATUS_CODES[status];
    const theme = this.options.themes[status];

    const err = new HttpError(text, status as number, text, theme);
    const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);

    return (req: Request, res: Response, next: NextFunction) => {
      if (this.isXHR(req))
        return res.status(status as number).json(payload);
      next();
    };

  }

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
  deny(status?: number | string, text?: string, view?: string) {

    if (isString(status)) {
      text = status;
      status = undefined;
    }

    status = status || 403;
    text = text || STATUS_CODES[status];
    view = view || ERROR_VIEW;
    const theme = this.options.themes[status];

    const err = new HttpError(text, status as number, text, theme);
    const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);

    return (req: Request, res: Response, next: NextFunction) => {

      if (this.isXHR(req))
        return res.status(status as number).json(payload);

      return this.renderFileOrView(req, res, next)(view, payload, status as number);

    };

  }

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
  view<T extends object = any>(view: string, context?: T) {
    return (req: Request, res: Response) => {
      return res.render(view, context);
    };
  }

  /**
   * Returns default redirect handler.
   * 
   * @example
   * .redirect('/to/some/new/path');
   * 
   * @param to the path to redirect to.
   */
  redirect(to: string) {
    return (req: Request, res: Response) => {
      return res.render(to);
    };
  }

  /**
   * Binds static path for resolving static content (images, styles etc)
   * 
   * @example
   * .static('./public', {  });
   * .static('./public', true);
   * .static('./public', {}, true);
   * 
   * @param path the path to the directory for static content.
   * @param options any ServeStaticOptions to be applied.
   * @param bind when true same as calling app.use(express.static('./public)).
   */
  static(path: string, options?: ServeStaticOptions | boolean, bind?: boolean) {
    if (isBoolean(options)) {
      bind = options;
      options = undefined;
    }
    const staticMiddleware = createStatic(path, options as ServeStaticOptions);
    if (bind)
      this.app.use(staticMiddleware);
    return staticMiddleware;
  }

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
  notFound(text?: string, view?: string) {

    text = text || STATUS_CODES[404];
    view = view || ERROR_VIEW;
    const theme = this.options.themes[404];

    const handler = async (req: Request, res: Response, next: NextFunction) => {

      const err = new HttpError(text as string, 404, text, theme);
      const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);

      if (this.isXHR(req))
        return res.status(404).json(payload);

      return this.renderFileOrView(req, res, next)(view, payload, 404);

    };

    return handler;

  }

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
  serverError(text?: string, view?: string): ErrorRequestHandler {

    text = text || STATUS_CODES[500];
    view = view || ERROR_VIEW;

    const handler = async (err: HttpError, req: Request, res: Response, next: NextFunction) => {

      const status = err.status || 500;
      const theme = this.options.themes[status];
      text = err.status ? STATUS_CODES[status] : text;

      err = new HttpError(err.message, status, text, theme);
      const payload = this.isProd ? this.cloneError(err, 'stack') : this.cloneError(err);

      if (this.isXHR(req))
        return res.status(status).json(payload);

      return this.renderFileOrView(req, res, next)(view, payload, status);

    };

    return handler;

  }

  /**
   * Renders Express view or static html file.
   * 
   * @param req the Express Request handler.
   * @param res the Express Response handler.
   * @param next the Express Next Function handler.
   */
  renderFileOrView(req: Request, res: Response, next?: NextFunction) {

    return async (view: string, context?: any, status?: number) => {

      const result = await awaiter(this.isView(view));
      status = status || 200;

      if (!result.err && result.data)
        return res.status(status).render(view, context);

      readFile(view, (err, html) => {
        if (err)
          return next(err);
        res.status(status).send(template(html.toString())(context));
      });

    };

  }

  // SERVICE & CONTROLLER //

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
  registerService<T extends Constructor>(Klass: T, mount?: string, ...args: any[]) {
    new Klass(mount, ...args);
    return this;
  }

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
  registerController<T extends Constructor>(Klass: T, base: string, mount?: string, ...args: any[]) {
    new Klass(base, mount, ...args);
    return this;
  }

  // CONFIGURATION //

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
  parseRoute<R extends Request = Request, S extends Response = Response>(
    route: string, base: string = '') {

    const parts = route.trim().toLowerCase().split(' ');

    if (parts.length === 1)
      parts.unshift(HttpMethod.Get);

    const methods = parts.shift().split('|').map(m => m === 'del' ? 'delete' : m);
    let path = parts.shift();

    // Normalize starting '/' and remove trailing '/';
    path = '/' + path.replace(/^\//, '').replace(/\/$/, '');

    let fullPath = join(base, path);
    fullPath = '/' + fullPath.replace(/^\//, '').replace(/\/$/, '');

    return {
      methods,
      path,
      fullPath
    };

  }

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
  protected registerRoute<R extends Request = Request, S extends Response = Response>(
    mount: string, route: string, handlers: ContextHandlers<R, S>[], entity?: string): this;

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
  protected registerRoute<R extends Request = Request, S extends Response = Response>(
    mount: string, base: string, route: string,
    handlers: ContextHandlers<R, S>[], entity?: string, isGenerated?: boolean): this;
  protected registerRoute<R extends Request = Request, S extends Response = Response>(
    mount: string, base: string, route: string | ContextHandlers<R, S>[],
    handlers?: string | ContextHandlers<R, S>[], entity?: string, isGenerated?: boolean) {

    if (isString(handlers)) {
      entity = handlers as string;
      handlers = route;
      route = base;
      base = undefined;
    }

    if (Array.isArray(route)) {
      handlers = route;
      route = base;
      base = undefined;
    }

    if (arguments.length === 3) {
      handlers = route as any;
      route = base;
      base = undefined;
    }

    base = base || '/';

    const root = this._routeMap[mount] = this._routeMap[mount] || {};
    const config = this.parseRoute(route as string, base);

    config.methods.forEach(method => {

      const origMethod = method;

      // For redirect, view, param we need to add to get collection.
      if (includes(['view', 'redirect'], method))
        method = 'get';

      root[method] = root[method] || {};

      const path = config.fullPath;

      // Show warning overriding path.
      if (has(root[method], path)) {

        this.emitter('route', 'duplicate', new Error(`Duplicate route "${path}" mounted at "${mount}" detected`));

        // If generated don't overwrite defined route.
        if (this.options.strict)
          return this;

      }

      const _handlers = handlers as (RequestHandlers<R, S> & { __namespace__: string })[];

      const isRedirect = origMethod === 'redirect';
      const isParam = origMethod === 'param';
      const isView = origMethod === 'view';

      const namespaces = _handlers.map(handler => {
        return handler.__namespace__ || handler.name || 'Anonymous';
      });

      const routeKey = `${method}.${path}`;
      const routeConfig = { mount, handlers, entity, method, isRedirect, isParam, isView, namespaces };

      set(root, routeKey, routeConfig);

      this.emitter('route', 'registered', `${method} ${path}`, routeConfig);

    });

    return this;

  }

  /**
   * Configures constructed class merging in initialized data from decorators.
   * 
   * @param entity the Service or Controller to configure init data for.
   * @param contexts the configuration contexts to merge/init data for.
   */
  protected configure(entity: Service | Controller, contexts: IConfig) {

    // Ensure templates.
    // Not sure I like this, maybe a 
    this.templates = this.templates || { ...(this.options.templates) };

    entity.filters = entity.filters || {};
    entity.routes = entity.routes || {};

    if (entity.baseType === EntityType.Controller) {
      const ctrl = entity as Controller;
      ctrl.policies = ctrl.policies || {};
      ctrl.actions = ctrl.actions || {};
    }

    else if (entity.baseType === EntityType.Service && (entity as Controller).policies) {
      throw new Error(`Service ${entity.type} cannot contain "policies", did you mean to use a Controller?`);
    }

    for (const k in contexts) {

      if ((k === ContextType.actions || k === ContextType.routes)) {

        for (const n in contexts[k]) {

          if (isEmpty(contexts[k])) continue;

          const decorators = contexts[k][n];

          // This is a decorator config.
          if (Array.isArray(decorators) && isPlainObject(decorators[0])) {

            decorators.forEach((d: IGenerateRouteConfig) => {

              const methods = castArray(d.methods);
              const ns = this.toNamespace(entity.type, d.key);
              const handler = this.lookupHandler(ns);
              let policyFilters = castArray(d.filters || []);

              // Handle Route Config
              if (d.decorator === DecoratorType.Route) {

                // If no route emit error.
                if (!d.path)
                  this.emitter('route', 'invalid', new Error(`Route failed, path for namespace "${ns}" is undefined`));

                else
                  contexts[k][`${methods.join('|')} ${d.path}`] = [...policyFilters, handler];

              }

              // Handle Action Config
              else {

                const tpltKey = d.template || (!d.path && d.key);
                const tplt = !d.path && tpltKey && this.templates[tpltKey];

                // For actions we need to lookup the policy.

                const policies = (entity as Controller).policies;
                const globalPol = castArray(policies['*'] || []) as Policy[];
                policyFilters = [...globalPol, ...castArray(policies[d.key] || [])];

                // Has known template.
                if (tplt) {

                  const props: IGenerateActionConfig = {
                    key: d.key,
                    methods: d.methods,
                    decorator: d.decorator
                  };

                  if (this.options.crud)
                    contexts[k][methods.join('|') + ' ' +
                      this.options.formatter(RouteType.Crud, tplt, props)] = [...policyFilters, handler];

                  if (this.options.rest)
                    contexts[k][methods.join('|') + ' ' +
                      this.options.formatter(RouteType.Rest, tplt, props)] = [...policyFilters, handler];

                }

                else {

                  if (!d.path)
                    d.path = `/${d.key}`;

                  contexts[k][`${methods.join('|')} ${d.path}`] = [...policyFilters, ...(d.filters as any), handler];

                }

              }

            });

            // Delete the original key
            delete contexts[k][n];

          }

        }

      }

      entity[k] = { ...contexts[k], ...entity[k] };

    }

    return entity;

  }

  /**
   * Iterates configuration contexts normalizing them for the purpose of building routes.
   * 
   * @example
   * .normalizeEntity(UserController);
   * 
   * @param entity the Service or Controller to be normalized.
   */
  protected normalizeEntity(entity: Service | Controller) {

    const ctrl = (entity.baseType === EntityType.Controller) && entity as Controller;

    let globalPolicies: any = [];

    // If controller lookup global policies.
    if (ctrl) {
      ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], ContextType.policies, '*');
      globalPolicies = ctrl.policies['*'];
    }

    const contexts = ctrl ? ['filters', 'policies', 'routes', 'actions'] : ['filters', 'routes'];

    contexts.forEach((context: any) => {

      this.normalizeNamespaces(entity, context);

      for (const key in entity[context]) {

        let handlers = entity[context][key];

        if (isUndefined(handlers))
          continue;

        // Store the last handler as we'll need it
        // to lookup policies for routes.
        const lastHandler = handlers[handlers.length - 1];

        handlers = this.normalizeHandlers(handlers, context, key);

        if (ctrl) {

          // If route we need to lookup the policy for 
          // the route when last handler is string.
          if (context === ContextType.routes || context === ContextType.actions) {

            if (isString(lastHandler)) {

              const lastHandlerPolicy = lastHandler.split('.');

              // If policy exists look it up and ensure handlers.
              if (ctrl.policies[lastHandlerPolicy[lastHandlerPolicy.length - 1]]) {
                lastHandlerPolicy.splice(1, 0, 'policies');
                const policies = this.normalizeHandlers([lastHandlerPolicy.join('.')], 'routes', key);
                handlers = [...globalPolicies, ...policies, ...handlers];
              }

            }

          }

        }

        entity[context][key] = handlers = uniq(handlers);

        // If route bind to router.
        if (context === ContextType.routes || context === ContextType.actions)
          this.registerRoute(entity.mountPath, entity.basePath, key, handlers,
            entity.type, context === ContextType.actions);

      }

    });

    return entity;

  }

  /**
   * Iterates each entity, loads init data then normalizes.
   * 
   * @example
   * .normalize();
   */
  normalize() {

    const entities = this.entities;

    for (const k in entities) {

      // Extend the filters, policies and routes with initialized properties.
      const entity =
        this.configure(entities[k] as (Service | Controller), (entities[k] as any).constructor.__INIT_DATA__);

      this.normalizeEntity(entity);

    }

    this._normalized = true;

    return this;

  }

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
  withServer(app?: Express | HttpServerOptions | HttpsServerOptions,
    options?: HttpServerOptions | HttpsServerOptions | boolean, isSSL?: boolean) {

    // An app was passed in.
    if (typeof app === 'function') {
      this.app = app;
    }
    else if (app) {
      isSSL = options as boolean;
      options = app;
      app = undefined;
    }

    const args: any = [this.app];

    if (options) args.unshift(options);

    let server;

    if (isSSL)
      server = createHttpsServer.apply(null, args);

    server = createHttpServer.apply(null, args);

    this.server = server;

    return server;

  }

  /**
   * Sets whether or not to run in strict mode.
   * 
   * @param strict boolean value indicating strict mode.
   */
  strict(strict: boolean = true) {
    this.options.strict = strict;
    return this;
  }

  /**
   * Mounts the routes from the generated routeMap to their respective routers.
   * 
   * @example
   * .mount();
   */
  mount() {

    const self = this;

    if (!this._normalized)
      this.normalize();

    // Add routes to routers.
    // Map is structured as
    // routeMap = {
    //   '/mount-point': {
    //       'get': {
    //          '/some/path': [ handlers ]
    //        }
    //    }
    // }
    for (const k in this.routeMap) {

      const router = this.routers[k];
      const methods = this.routeMap[k];

      for (const m in methods) {
        const routes = Object.keys(methods[m]);

        if (this.options.sort)
          routes.reverse();

        routes
          .forEach(r => {
            const config = methods[m][r];
            const rtr = { router: k };
            self.emitter('route', 'mounted', { ...config, ...({ mount: k }) });
            router[m](r, ...(config.handlers));
          });
      }

      // // Default router is already mounted.
      if (k !== '/')
        this.app.use(k, router);

    }

    this.emitter('mount', 'completed');

    return this;

  }

  /**
   * Initializes Tensil ensuring Server, normalizing routes, mounting routes.
   * 
   * @example
   * .init();
   */
  init() {

    if (this._initialized)
      return this;

    this
      .normalize()
      .mount();

    this._initialized = true;

    this.emitter('init', 'completed');

    return this;

  }

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
  start(port?: number | Noop, host?: string | Noop, fn?: Noop) {

    if (typeof port === 'function') {
      fn = port;
      port = undefined;
    }

    if (typeof host === 'function') {
      fn = host;
      host = undefined;
    }

    this.port = port = (port || 3000) as number;
    this.host = host = (host || '127.0.0.1') as string;

    fn = fn || (() => {
      const msg = `[TENSIL]: SERVER Listening at ${host}:${port}`;
      if (process.env.NODE_ENV !== 'test')
        console.log(msg);
    });

    // Ensure Tensil is initialized.
    this.init();

    const server =
      ((this.server || this.app) as HttpServer | HttpsServer)
        .listen(port, host as any, () => {
          this.emitter('start', 'completed');
          fn();
        });

    // If no server then we started using
    // Express app, save the server reference.
    if (!this.server)
      this.server = server;

    return this;

  }

}

let _instance: Tensil;

function initTensil() {
  if (!_instance)
    _instance = new Tensil();
  return _instance;
}

export { Tensil, Service, Controller };

export default initTensil();
