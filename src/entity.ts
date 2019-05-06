import { Router, Express, NextFunction } from 'express';
import { Core } from './core';
import { EventEmitter } from 'events';
import { castArray, has, isObject } from 'lodash';
import { Filter, Action, IFilters, IPolicies, IRoutes, EntityType, IActions, ContextTypes, ITemplates } from './types';
import { Tensil } from './tensil';

export class Entity extends EventEmitter {

  protected _core: Core;

  protected policies: IPolicies;
  protected filters: IFilters;
  protected routes: IRoutes;
  protected actions: IActions;

  type: string;
  baseType: string;
  mountPath: string;
  basePath: string;
  templates: ITemplates;

  constructor();
  constructor(base: string, mount?: string, app?: Express);
  constructor(base?: string, mount?: string, app?: Express) {
    super();
    const ctorName = this.constructor.name;

    this._core = Core.getInstance(app);

    this.type = ctorName;
    this.baseType = this._core.getType(this);
    this.mountPath = '/' + ((mount || '/').trim().toLowerCase()).replace(/^\/\/?/, '');

    // Defaults basePath to controller name without "Controller"
    if (this.baseType === EntityType.Controller) {
      base = base || ctorName.toLowerCase().replace(/controller$/, '');
      this.basePath = base.replace(/^\//, '');
    }

    // Check if router exists
    if (this.mountPath && !this._core.routers[this.mountPath])
      this._core.routers[this.mountPath] = Router();

    // Set readonly properties.
    Object.defineProperties(this, {
      _core: { enumerable: false },
      name: { writable: false }
    });

    // Register the service with core.
    const registered = this._core.registerInstance(this);
    if (!registered)
      this.emitter('entity', 'duplicate',
        new Error(`Skipping duplicate registration for ${this.baseType} "${this.type}"`));
    else
      this.emitter('entity', 'registered', registered);

  }

  /**
   * Helper method for emitting events.
   * 
   * @param key the group key of the event.
   * @param type the subtype of the group.
   * @param args arguments to pass to the emit event.
   */
  protected emitter(key: string, type: string, ...args: any[]) {

    // First arg is error.
    const isError = args[0] instanceof Error;

    this.emit('*', key, type, ...args);
    this.emit(key, type, ...args);
    this.emit(`${key}:${type}`, ...args);

    // If in strict mode after emitting 
    // events by type emit the error.
    if (isError && this.isStrict())
      this.emit('error', args[0]);

    return this;

  }

  /**
   * Ensures a key does not exist in a context collection.
   * 
   * @example
   * .validKey('isAuthorized', 'filters');
   * .validKey('isAuthorized', 'filters', true);
   * 
   * @param key checks if a key exists in the collection.
   * @param context the context to inspect in.
   * @param force when true allows overwrite of existing key.
   */
  protected validateKey(key: string, context: ContextTypes, force?: boolean) {

    key = key.trim();

    if (has(this[context], key) && !force)
      return '';

    return key;

  }

  get app() {
    return this._core.app;
  }

  set app(app: Express) {
    this._core.app = app;
  }

  get router() {
    return this._core.routers[this.mountPath];
  }

  /**
   * Returns value indicating if running in strict mode.
   */
  isStrict() {
    const strict = (this._core.entities.Tensil as Tensil).options.strict;
    if (typeof strict === 'undefined' && process.env.NODE_ENV === 'production')
      return true;
    return strict;
  }

  /**
   * Merges policies with the provided object.
   * 
   * @example
   * .policy({  
   *   find: ['isAuthorized']
   * });
   * 
   * @param policies the filter collection object.
   */
  filter(filters: IFilters): this;

  /**
   * Adds policy to collection.
   * 
   * @example
   * .policy('find', 'isAuthorized');
   * .policy('find', 'isAuthorized', true);
   * 
   * @param key the filters's key.
   * @param filters the filters or array of filters.
   * @param force when true overwrites existing.
   */
  filter(key: string, filters: Filter | Filter[], force?: boolean): this;
  filter(key: string | IFilters, filters?: Filter | Filter[], force: boolean = false) {

    if (isObject(key)) {
      this.filters = { ...key };
      this.emitter('filter', 'create', this.filters);
      return this;
    }

    filters = castArray(filters) as Filter[];
    const validKey = this.validateKey(key, 'filters', force);

    if (!validKey) {
      this.emitter('filter', 'invalid', new Error(`Filter key "${key}" exists set force to true to overwrite`));
      return this;
    }

    this.filters = this.filters || {};
    this.filters[validKey] = filters;

    this.emitter('filter', 'create', { [validKey]: filters });

    return this;

  }

  /**
   * Merges routes with the provided object.
   * 
   * @example
   * .route({  
   *   'get /user': ['isAuthorized', 'UserController.find']
   * });
   * 
   * @param routes the route collection object.
   */
  route(routes: IRoutes): this;

  /**
   * Adds route to collection.
   * 
   * @example
   * .route('get /user', ['isAuthorized', 'UserController.find']);
   * .route('get /user', ['isAuthorized', 'UserController.find', true]);
   * 
   * @param route the route path.
   * @param actions the action or array of actions.
   * @param force when true overwrites existing.
   */
  route(route: string, actions: Filter | Filter[] | Action | Action[], force?: boolean): this;
  route(route: string | IRoutes, actions?: Filter | Filter[] | Action | Action[], force: boolean = false) {

    if (isObject(route)) {
      this.routes = { ...route };
      this.emitter('route', 'create', this.routes);
      return this;
    }

    actions = castArray(actions) as Action[];
    const validRoute = this.validateKey(route, 'routes', force);

    if (!validRoute) {
      this.emitter('route', 'invalid', new Error(`Route "${route}" exists set force to true to overwrite`));
      return this;
    }

    this.routes = this.routes || {};
    this.routes[validRoute] = actions;

    this.emitter('route', 'create', { [validRoute]: actions });

    return this;

  }

}
