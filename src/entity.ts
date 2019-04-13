import { Express, Router } from 'express';
import { Core } from './core';
import { isBoolean, castArray, has, isObject } from 'lodash';
import { Filter, Policy, Action, IFilters, IPolicies, IRoutes, IConfig, IActions, ENTITY_TYPES } from './types';

export class Entity {

  protected _type: string;
  protected _core: Core;

  protected policies: IPolicies;
  protected filters: IFilters;
  protected routes: IRoutes;
  protected actions: IActions;

  name: string;
  mountPath: string;

  constructor();
  constructor(name?: string, mount?: string, app?: Express);
  constructor(name?: string, mount?: string, type?: string, app?: Express);
  constructor(name?: string, mount?: string, type?: string | Express, app?: Express) {

    const ctorName = this.constructor.name;

    // If NOT known base type use constructor name first param is mount.
    if (!~ENTITY_TYPES[ctorName] && !mount) {
      mount = name;
      name = undefined;
    }

    if (typeof type === 'function') {
      app = type;
      type = undefined;
    }

    this._core = Core.getInstance(app);
    this._type = <string>type || 'service';
    this.name = (name || ctorName).trim();
    this.mountPath = (mount || '/').trim().toLowerCase();

    // Check if router exists
    if (this.mountPath && !this._core.routers[this.mountPath])
      this._core.routers[this.mountPath] = Router();

    // Set readonly properties.
    Object.defineProperties(this, {
      _core: { enumerable: false },
      _type: { enumerable: false, writable: false },
      name: { writable: false }
    });

    // Register the service with core.
    this._core.registerEntity(this);

  }

  private validateKey(key: string, context: 'policies' | 'filters' | 'routes', force: boolean) {

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

  policy(enabled?: boolean): this;
  policy(policies: IPolicies): this;
  policy(key?: string, policies?: Policy | Policy[], force?: boolean)
  policy(key?: string | boolean | IPolicies, policies?: Policy | Policy[], force: boolean = false) {

    if (isObject(key)) {
      this.policies = key;
      return this;
    }

    if (isBoolean(key)) {
      policies = [key];
      key = '*';
    }

    policies = castArray(policies) as Policy[];
    key = this.validateKey(key, 'policies', force);

    if (!key)
      throw new Error(`Policy key "${key}" exists set force to true to overwrite`);

    this.policies[key] = policies;

    return this;

  }

  filter(filters: IFilters): this;
  filter(key: string, filters: Filter | Filter[], force?: boolean): this;
  filter(key: string | IFilters, filters?: Filter | Filter[], force: boolean = false) {

    if (isObject(key)) {
      this.filters = key;
      return this;
    }

    filters = castArray(filters) as Filter[];
    key = this.validateKey(key, 'filters', force);

    if (!key)
      throw new Error(`Filter key "${key}" exists set force to true to overwrite`);

    this.filters[key] = filters;

    return this;

  }

  route(routes: IRoutes): this;
  route(route: string, actions: Filter | Filter[] | Action | Action[], force?: boolean): this;
  route(route: string | IRoutes, actions?: Filter | Filter[] | Action | Action[], force: boolean = false) {

    if (isObject(route)) {
      this.routes = route;
      return this;
    }

    actions = castArray(actions) as Action[];
    route = this.validateKey(route, 'routes', force);

    if (!route)
      throw new Error(`Route "${route}" exists set force to true to overwrite`);

    this.routes[route] = actions;

    return this;

  }

}
