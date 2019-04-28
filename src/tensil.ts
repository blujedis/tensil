import { Express, Request, Response, static as createStatic } from 'express';
import { ServeStaticOptions } from 'serve-static';
import { Server as HttpServer, createServer as createHttpServer, ServerOptions as HttpServerOptions } from 'http';
import { Server as HttpsServer, createServer as createHttpsServer, ServerOptions as HttpsServerOptions } from 'https';
import { Entity } from './entity';
import {
  isBoolean, get, set, has, isString, isFunction, castArray, isObject, isUndefined,
  uniq, includes
} from 'lodash';
import { join } from 'path';
import {
  IPolicies, IFilters, IRoutes, IRouters, IEntities, Policy,
  Constructor, EntityType, ContextType, ContextTypes,
  IActions, HttpMethod, IOptions, IRouteMap, Noop, IConfig
} from './types';

const DEFAULT_OPTIONS: IOptions = {

  templates: {
    get: HttpMethod.Get + ' ' + '/{{action}}',
    put: HttpMethod.Put + ' ' + '/{{action}}/:id?',
    post: HttpMethod.Post + ' ' + '/{{action}}',
    del: HttpMethod.Del + ' ' + '/{{action}}/:id?',
    find: HttpMethod.Get + ' ' + '/{{action}}/:id?',
    create: HttpMethod.Post + ' ' + '/{{action}}',
    update: HttpMethod.Put + ' ' + '/{{action}}/:id?',
    delete: HttpMethod.Del + ' ' + '/{{action}}/:id?',
  },

  rest: true,
  crud: false,
  sort: true,

  formatter: (key: string, path: string, type: 'rest' | 'crud') => {
    if (type === 'rest')
      return path.replace(/{{action}}/, '').replace(/^\/\//, '/');
    key = key.replace(/ById$/, '');
    return path.replace(/{{action}}/, '');
  }

};

export class Service<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {

  filters: IFilters;
  routes: IRoutes;

  constructor();
  constructor(mount: string);
  constructor(mount?: string) {
    super(undefined, mount);
  }

}

export class Controller<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {

  policies: IPolicies;
  filters: IFilters;
  routes: IRoutes;
  actions: IActions;

  constructor(base: string, mount?: string) {
    super(base, mount);
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
      this.policies = { ...(this.policies), ...key };
      this.tensil.emit('policy', key, this.policies);
      return this;
    }

    if (isBoolean(key)) {
      policies = key;
      key = '*';
    }

    policies = castArray(policies) as Policy[];
    const validKey = this.validateKey(key, 'policies', force);

    if (!validKey)
      throw new Error(`Policy key "${key}" exists set force to true to overwrite`);

    this.policies = this.policies || {};
    this.policies[validKey] = policies;

    this.tensil.emit('policy', { [validKey]: policies }, this.policies);

    return this;

  }

}

export class Tensil<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {

  static Service: typeof Service = Service;
  static Controller: typeof Controller = Controller;

  private _initialized = false;
  private _normalized = false;
  private _events: { [key: string]: ((...args: any[]) => void)[] } = {};
  private _routeMap: IRouteMap = {};

  options: IOptions;
  server: HttpServer | HttpsServer;

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

    const entities = this._core.entities;

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
    if (result && isFunction(result))
      result.bind(entity);

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
  protected normalizeHandlers(handlers: any, context: ContextTypes, key?: string): Function[] {

    // If a route check if is redirect or view route.
    if (context === ContextType.routes) {

      const parts = key.split(' ');

      // lookup default handler if needed.
      if (includes(['view', 'redirect'], parts[0].toLowerCase())) {

        const idx = handlers.length - 1;
        const handler = handlers[idx];

        handlers[idx] = parts[0] === 'view'
          ? this.view(handler[0].replace(/^\//, ''), handler[1])
          : this.redirect(handler[0]);
      }

    }

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

        result = (handler === true) ? [] : this.deny || [];

      }

      else {
        result = [...result, handler];
      }

      return result;

    }, []);

  }

  get entities(): IEntities {
    return this._core.entities;
  }

  get routers(): IRouters {
    return this._core.routers;
  }

  get routeMap() {
    return this._routeMap;
  }

  /**
   * Binds event listener to event.
   * 
   * @example
   * .on('start', () => { console.log('server started'); });
   * 
   * @param event the event to listen on.
   * @param handler the handler to be called on emit.
   */
  on(event: string, handler: (...args: any[]) => void) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(handler);
    return this;
  }

  /**
   * Emits events by name.
   * 
   * @example
   * .emit('register', SomeEntity);
   * 
   * @param event the event to be emitted.
   * @param args the arguments to be passed to the handler.
   */
  emit(event: string, ...args: any[]) {
    (this._events[event] || []).forEach(fn => fn(...args));
  }

  /**
   * Disables an event removing it from the collection.
   * 
   * @example
   * .off('register', (entity: Entity) => {});
   * 
   * @param event the event to be disabled.
   * @param handler the handler within event collection to be removed.
   */
  off(event: string, handler: (...args: any[]) => void) {
    const idx = this._events[event] && this._events[event].indexOf(handler);
    if (~idx)
      this._events[event].splice(idx, 1);
    return this;
  }

  /**
   * Removes all handlers for the specified event.
   * 
   * @example
   * .removeEvents('register');
   * 
   * @param event the event name to remove handlers for.
   */
  removeEvents(event: string) {
    delete this._events[event];
  }

  /**
   * Gets a Service by name.
   * 
   * @example
   * .getService('LogService');
   * .getService<Request, Response>('LogService');
   * 
   * @param name the name of the Service to get.
   */
  getService<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P> {
    const entity = this.entities[name];
    if (entity.baseType !== EntityType.Service)
      return null;
    return entity as any;
  }

  /**
   * Gets a Controller by name.
   * 
   * @example
   * .getController('UserController');
   * .getController<Request, Response>('LogService');
   * 
   * @param name the name of the Controller to get.
   */
  getController<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P> {
    const entity = this.entities[name];
    if (entity.baseType !== EntityType.Controller)
      return null;
    return entity as any;
  }

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
  registerService<T extends Constructor>(Klass: T, mount?: string) {
    new Klass(undefined, mount);
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
  registerController<T extends Constructor>(Klass: T, base: string, mount?: string) {
    new Klass(base, mount);
    return this;
  }

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
  parseRoute(route: string, base: string = '') {

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
  registerRoute(mount: string, base: string, route: string | Function[],
    handlers?: string | Function[], controller?: string) {

    if (isString(handlers)) {
      controller = handlers as string;
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

    config.methods.forEach(m => {

      root[m] = root[m] || {};

      const path = config.fullPath; // join(mount, config.fullPath);

      // Show warning overriding path.
      if (has(root[m], path) && process.env.NODE_ENV !== 'production') {
        console.warn(`[Tensil] WARN: overriding route path "${path}" mounted at "${mount}"`);
      }

      set(root, `${m}.${path}`, handlers);

      // root[m][path] = handlers;

      // For redirect/view we need to add to get collection.
      if (includes(['view', 'redirect'], m)) {
        root.get = root.get || {};
        // root.get[path] = handlers;
        set(root, `get.${path}`, handlers);
      }

      if (controller)
        set(root, `${controller}.${m}.${path}`, handlers);

    });

    return this;

  }

  /**
   * Configures constructed class merging in initialized data from decorators.
   * 
   * @param entity the Service or Controller to configure init data for.
   * @param contexts the configuration contexts to merge/init data for.
   */
  configure(entity: Service | Controller, contexts: IConfig) {

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
  normalizeEntity(entity: Service | Controller) {

    const ctrl = (entity.baseType === EntityType.Controller) && entity as Controller;

    // Entity is a controller.
    if (ctrl) {

      // Check global policy.
      ctrl.policies = ctrl.policies || {};
      ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], ContextType.policies, '*');

      // Generate routes for controllers.
      if (ctrl.actions) {

        for (const k in ctrl.actions) {

          let route = ctrl.actions[k] || this.options.templates[k];
          route = this.options.templates[route] || route;

          // If no route by this point throw error.
          if (!route)
            throw new Error(`Action ${entity.type}.${k} route could NOT be generated using path ${route}`);

          const actionKey = `${entity.type}.${k}`;

          // Lookup the policies for action.
          let handlers = this.normalizeHandlers(actionKey, ContextType.actions, k);
          handlers = uniq([...(ctrl.policies['*'] as any[]), ...handlers]);

          // Generate rest route.
          if (this.options.rest) {
            const restPath = this.options.formatter(k, route, 'rest');
            this.registerRoute(ctrl.mountPath, ctrl.basePath, restPath, handlers, entity.type);
          }

          // Generate crud route.
          if (this.options.crud) {
            const crudPath = this.options.formatter(k, route, 'crud');
            this.registerRoute(ctrl.mountPath, ctrl.basePath, crudPath, handlers, entity.type);
          }

        }

      }

    }

    const contexts = ctrl ? ['filters', 'policies', 'routes'] : ['filters', 'routes'];

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

        // When context is policies merge global policy.
        if (ctrl && context === ContextType.policies)
          handlers = [...(ctrl.policies['*'] as any[]), ...handlers];

        // If route we need to lookup the policy for 
        // the route when last handler is string.
        if (context === ContextType.routes) {

          if (isString(lastHandler)) {
            const lastHandlerPolicy = lastHandler.split('.');
            lastHandlerPolicy.splice(1, 0, 'policies');
            const policyHandlers = this.normalizeHandlers([lastHandlerPolicy.join('.')], 'routes', key);
            handlers = [...policyHandlers, ...handlers];
          }

        }

        entity[context][key] = handlers = uniq(handlers);

        // If route bind to router.
        if (context === ContextType.routes)
          this.registerRoute(entity.mountPath, entity.basePath, key, handlers);

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
   * Creates an Http Server with specified app and options.
   * 
   * @example
   * .createServer(app);
   * .createServer(tensil.app, {});
   * 
   * @param app an Express app to bind to the server.
   * @param options the Http Server options to apply on create.
   */
  createServer(app: Express, options?: HttpServerOptions): HttpServer;

  /**
   * Creates an Http Server with specified app and options.
   * 
   * @example
   * .createServer(tensil.app, {}, true);
   * 
   * @param app the Express app to bind to the server.
   * @param options the Https server options.
   * @param isSSL indicates an Https server is being created.
   */
  createServer(app: Express, options: HttpsServerOptions, isSSL: boolean): HttpsServer;

  createServer(app: Express | HttpServerOptions | HttpsServerOptions,
    options?: HttpServerOptions | HttpsServerOptions, isSSL?: boolean) {

    options = options || {};

    let server;

    if (isSSL)
      server = createHttpsServer(options as HttpsServerOptions, app as Express);

    server = createHttpServer(options as HttpServerOptions, app as Express);

    this.server = server;

    return server;

  }

  /**
   * Binds the Http Server instance to Tensil.
   * 
   * @example
   * import { createServer } from 'http';
   * import * as express from 'express';
   * const server = createServer(express());
   * .bindServer(server);
   * 
   * @param server the server to use for listening to requests.
   */
  bindServer(server: HttpServer | HttpsServer) {
    this.server = server as HttpServer | HttpsServer;
    return this;
  }

  /**
   * Mounts the routes from the generated routeMap to their respective routers.
   * 
   * @example
   * .mount();
   */
  mount() {

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

      Object.keys(methods)
        .filter(m => includes(['get', 'put', 'post', 'delete', 'param'], m))
        .forEach(m => {
          const routes = Object.keys(methods[m]);
          if (this.options.sort)
            routes.reverse();
          routes
            .forEach(r => {
              router[m](r, ...methods[m][r]);
            });
        });

      // Default router is already mounted.
      if (k !== '/') {
        this.app.use(k, router);
      }

    }

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
  start(port: number, host: string, fn?: Noop): this;
  start(port?: number, host?: string | Noop, fn?: Noop) {

    if (typeof host === 'function') {
      fn = host;
      host = undefined;
    }

    port = port || 3000;
    host = (host || '127.0.0.1') as string;

    fn = fn || (() => {
      if (process.env.NODE_ENV !== 'test')
        console.log(`[TENSIL]: SERVER Listening at ${host}:${port}`);
    });

    // Ensure Tensil is initialized.
    this.init();

    const server =
      ((this.server || this.app) as HttpServer | HttpsServer)
        .listen(port, host as string, () => {
          this.emit('start');
          fn();
        });

    // If no server then we started using
    // Express app, save the server reference.
    if (!this.server)
      this.server = server;

    return this;

  }

}
