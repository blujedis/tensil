import { Express, Request, Response, Router } from 'express';
import { Entity } from './entity';
import { isBoolean, get, set, has, isString, isFunction, castArray, isUndefined, uniq, includes } from 'lodash';
import { join } from 'path';
import {
  IPolicies, IFilters, IRoutes, IRouters, IEntities,
  Constructor, EntityType, ContextType, ContextTypes,
  IActions, HttpMethod, IOptions, IRouteMap
} from './types';
import { isObject } from 'util';

const DEFAULT_OPTIONS: IOptions = {

  actions: {
    find: HttpMethod.Get + ' ' + '/{{action}}',
    findById: HttpMethod.Get + ' ' + '/{{action}}/:id',
    create: HttpMethod.Get + ' ' + '/{{action}}',
    update: HttpMethod.Get + ' ' + '/{{action}}',
    updateById: HttpMethod.Get + ' ' + '/{{action}}/:id',
    delete: HttpMethod.Get + ' ' + '/{{action}}',
    deleteById: HttpMethod.Get + ' ' + '/{{action}}/:id',
  },

  rest: true,
  crud: false,

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

}

export class Tensil<R extends Request = Request, S extends Response = Response> extends Entity<R, S> {

  static Service: typeof Service = Service;
  static Controller: typeof Controller = Controller;

  private _events: { [key: string]: ((...args: any[]) => void)[] } = {};
  private _routeMap: IRouteMap = {};

  options: IOptions;

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

  on(event: string, handler: (...args: any[]) => void) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(handler);
    return this;
  }

  emit(event: string, ...args: any[]) {
    (this._events[event] || []).forEach(fn => fn(...args));
  }

  off(event: string, handler: (...args: any[]) => void) {
    const idx = this._events[event] && this._events[event].indexOf(handler);
    if (~idx)
      this._events[event].splice(idx, 1);
    return this;
  }

  removeEvents(event: string) {
    delete this._events[event];
  }

  getService<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P> {
    const entity = this.entities[name];
    if (entity.baseType !== EntityType.Service)
      return null;
    return entity as any;
  }

  getController<Q extends Request = R, P extends Response = S>(name: string): Service<Q, P> {
    const entity = this.entities[name];
    if (entity.baseType !== EntityType.Controller)
      return null;
    return entity as any;
  }

  registerService<T extends Constructor>(Klass: T, mount?: string) {
    new Klass(undefined, mount);
    return this;
  }

  registerController<T extends Constructor>(Klass: T, base: string, mount?: string) {
    new Klass(base, mount);
    return this;
  }

  parseRoute(route: string, base: string = '') {

    const parts = route.trim().toLowerCase().split(' ');

    if (parts.length === 1)
      parts.unshift(HttpMethod.Get);

    const methods = parts.shift().split('|');
    let path = parts.shift();

    // Normalize starting '/' and remove trailing '/';
    path = '/' + path.replace(/^\//, '').replace(/\/$/, '');

    const fullPath = join(base, path).replace(/\/$/, '');

    return {
      methods,
      path,
      fullPath
    };

  }

  registerRoute(mount: string, route: string, handlers: Function[], controller?: string): this;
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

      const path = join(mount, config.fullPath);

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

  initEntity(entity: Service | Controller, contexts: {
    filters: IFilters, routes: IRoutes,
    policies?: IPolicies, actions?: IActions
  }) {

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

  normalizeEntity(entity: Service | Controller) {

    const ctrl = (entity.baseType === EntityType.Controller) && entity as Controller;

    // Entity is a controller.
    if (ctrl) {

      // Check global policy.
      ctrl.policies = ctrl.policies || {};
      const globalPol = isUndefined(ctrl.policies['*']) ? [] : ctrl.policies['*'];
      ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], ContextType.policies, '*');

      // Generate routes for controllers.
      if (ctrl.actions) {

        const merged = { ...(ctrl.actions), ...this.options.actions };

        for (const k in ctrl.actions) {

          const route = merged[k];
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

  normalize() {

    const entities = this.entities;

    for (const k in entities) {

      // Extend the filters, policies and routes with initialized properties.
      const entity =
        this.initEntity(entities[k] as (Service | Controller), (entities[k] as any).constructor.__INIT_DATA__);

      this.normalizeEntity(entity);

    }

    return this;

  }

  mount() {

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
        .filter(m => includes(['get', 'put', 'post', 'delete'], m))
        .forEach(m => {
          Object.keys(methods[m])
            .reverse()
            .forEach(r => {
              router[m](r, ...methods[m][r]);
            });
        });

      // Default router is already mounted.
      if (k !== '/')
        this.app.use(k, router);

    }

    return this;

  }

  init(strict: boolean = true) {

    this
      .normalize()
      .mount();

    return this;

  }

}
