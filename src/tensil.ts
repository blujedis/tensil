import { Express, Request, Response } from 'express';
import { Entity } from './entity';
import { isBoolean, get, isString, isFunction, castArray, isUndefined, uniq } from 'lodash';
import {
  IPolicies, IFilters, IRoutes, IRouters, EntityExtended, IEntities,
  Constructor, EntityType, ContextType, ContextTypes, RequestHandler
} from './types';

export class Service extends Entity {

  filters: IFilters;
  routes: IRoutes;

  constructor();
  constructor(mount: string);
  constructor(mount?: string) {
    super(undefined, mount);
  }

}

export class Controller extends Entity {

  generate: boolean = true;

  policies: IPolicies;
  filters: IFilters;
  routes: IRoutes;

  constructor(base: string, mount?: string) {
    super(base, mount);
  }

}

export class Tensil<R extends Request, S extends Response> extends Entity {

  static Service: typeof Service;
  static Controller: typeof Controller;

  private _allowHandler: RequestHandler<R, S> = (req, res, next) => next;
  private _denyHandler: RequestHandler<R, S> = (req, res, next) => res.status(403).send;
  private _viewHandler: RequestHandler<R, S> = (req, res, next) => res.status(403).send;

  events: { [key: string]: ((...args: any[]) => void)[] } = {};

  constructor()
  constructor(app: Express)
  constructor(app?: Express) {
    super(undefined, undefined, app);
  }

  protected normalizeNamespaces(entity: EntityExtended, context: ContextTypes) {

    const map = entity[context];
    const entityType = entity.type;

    for (const k in map) {

      // Ensure is an array if not bool.
      if (!isBoolean(map[k])) {

        map[k] = castArray(map[k]).reduce((a, c) => {

          if (isString(c)) {

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

          return [...a, c];

        }, []);

      }

    }

  }

  protected lookupHandler(namespace: string, context: ContextTypes) {

    const entities = this._core.entities;

    const parts = namespace.split('.');
    const entityType = parts.shift() || '';
    const entity = entities[entityType] as EntityExtended;

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

  protected normalizeHandlers(handlers: any, context: ContextTypes, key: string): Function[] {

    return castArray(handlers || []).reduce((result, handler) => {

      // Lookup the filter.
      if (isString(handler)) {

        const lookup = this.lookupHandler(handler, context);

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
            context.slice(1)} "${key}" cannot contain boolean handler.`);

        result = (handler === true) ? this._allowHandler || [] : this._denyHandler || [];

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

  get allowHandler() {
    return this._allowHandler;
  }

  set allowHandler(fn: RequestHandler<R, S>) {
    this._allowHandler = fn;
  }

  get denyHandler() {
    return this._denyHandler;
  }

  set denyHandler(fn: RequestHandler<R, S>) {
    this._denyHandler = fn;
  }

  get viewHandler() {
    return this._viewHandler;
  }

  set viewHandler(fn: RequestHandler<R, S>) {
    this._viewHandler = fn;
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.events[event] = this.events[event] || [];
    this.events[event].push(handler);
    return this;
  }

  emit(event: string, ...args: any[]) {
    (this.events[event] || []).forEach(fn => fn(...args));
  }

  off(event: string, handler: (...args: any[]) => void) {
    const idx = this.events[event] && this.events[event].indexOf(handler);
    if (~idx)
      this.events[event].splice(idx, 1);
    return this;
  }

  removeEvents(event: string) {
    delete this.events[event];
  }

  entity<T extends Entity>(name: string): T {
    return this.entities[name] as T;
  }

  registerService<T extends Constructor>(Klass: T, mount?: string) {
    new Klass(undefined, mount);
    return this;
  }

  registerController<T extends Constructor>(Klass: T, base: string, mount?: string) {
    new Klass(base, mount);
    return this;
  }

  parseRoutes(route: string, handlers: any) {
    //
  }

  initEntity(entity: EntityExtended, data: { filters: IFilters, routes: IRoutes, policies?: IPolicies }) {

    entity.filters = entity.filters || {};
    entity.routes = entity.routes || {};

    if (entity.baseType === EntityType.Controller)
      entity.policies = entity.policies || {};
    else if (entity.baseType === EntityType.Service && entity.policies)
      throw new Error(`Service ${entity.type} cannot contain "policies", did you mean to use a Controller?`);

    for (const k in data) {
      entity[k] = { ...data[k], ...entity[k] };
    }

    return entity;

  }

  normalizeEntity(entity: Service | Controller) {

    const ctrl = (entity.baseType === EntityType.Controller) && entity as Controller;

    // When controller we need to get the global policy.
    if (ctrl) {
      ctrl.policies = ctrl.policies || {};
      ctrl.policies['*'] = ctrl.policies['*'] || true;
      ctrl.policies['*'] = this.normalizeHandlers(ctrl.policies['*'], ContextType.policies, '*');
    }

    const contexts = ctrl ? ['filters', 'policies', 'routes'] : ['filters', 'routes'];

    contexts.forEach((context: any) => {

      this.normalizeNamespaces(entity as EntityExtended, context);

      for (const key in entity[context]) {

        let handlers = entity[context][key];

        if (isUndefined(handlers))
          continue;

        handlers = this.normalizeHandlers(handlers, context, key);

        // When context is policies merge global policy.
        if (ctrl && context === ContextType.policies)
          handlers = [...(ctrl.policies['*'] as any[]), ...handlers];

        entity[context][key] = uniq(handlers);

      }

    });

    return entity;

  }

  normalize() {

    const entities = this.entities;

    for (const k in entities) {

      // Extend the filters, policies and routes with initialized properties.
      const entity =
        this.initEntity(entities[k] as EntityExtended, (entities[k] as any).constructor.__INIT_DATA__);

      this.normalizeEntity(entity);

    }

    return this;

  }

  mount() {

    const mountPoints =
      Object.keys(this.routers)
        .filter(v => v !== '/')
        .sort();

    mountPoints.forEach(mount => {
      this.app.use(mount, this.routers[mount]);
    });

    return this;

  }

  init(isProduction: boolean = true) {

    this
      .normalize()
      .mount();

    return this;

  }

}

Tensil.Service = Service;
Tensil.Controller = Controller;
