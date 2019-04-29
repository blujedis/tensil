import { Router, Express, NextFunction } from 'express';
import { Core } from './core';
import { Tensil } from './tensil';
import { castArray, has, isObject } from 'lodash';
import { Filter, Action, IFilters, IPolicies, IRoutes, EntityType, IActions, ContextTypes } from './types';

export class Entity {

  protected _core: Core;

  protected policies: IPolicies;
  protected filters: IFilters;
  protected routes: IRoutes;
  protected actions: IActions;

  type: string;
  baseType: string;
  mountPath: string;
  basePath: string;

  constructor();
  constructor(base: string, mount?: string, app?: Express);
  constructor(base?: string, mount?: string, app?: Express) {

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
    this._core.registerInstance(this);

  }

  protected get tensil(): Tensil {
    return this._core.entities.Tensil as any;
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

  get router() {
    return this._core.routers[this.mountPath];
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
      this.filters = { ...(this.filters), ...key };
      this.tensil.emit('filter', key, this.filters);
      return this;
    }

    filters = castArray(filters) as Filter[];
    const validKey = this.validateKey(key, 'filters', force);

    if (!validKey)
      throw new Error(`Filter key "${key}" exists set force to true to overwrite`);

    this.filters = this.filters || {};
    this.filters[validKey] = filters;

    this.tensil.emit('filter', { [validKey]: filters }, this.filters);

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
      this.routes = { ...(this.routes), ...route };
      this.tensil.emit('route', route, this.routes);
      return this;
    }

    actions = castArray(actions) as Action[];
    const validRoute = this.validateKey(route, 'routes', force);

    if (!validRoute)
      throw new Error(`Route "${route}" exists set force to true to overwrite`);

    this.routes = this.routes || {};
    this.routes[validRoute] = actions;

    this.tensil.emit('route', { [validRoute]: actions }, this.routes);

    return this;

  }

}
