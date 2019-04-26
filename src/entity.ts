import { Express, Router } from 'express';
import { Core } from './core';
import { Tensil } from './tensil';
import { isBoolean, castArray, has, isObject } from 'lodash';
import { Filter, Policy, Action, IFilters, IPolicies, IRoutes, EntityType } from './types';
import { Request, Response } from 'express-serve-static-core';

export class Entity {

  protected _core: Core;

  protected policies: IPolicies;
  protected filters: IFilters;
  protected routes: IRoutes;
  protected generate: boolean = false;

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
    this.mountPath = (mount || '/').trim().toLowerCase();

    // Defaults basePath to controller name without "Controller"
    if (this.baseType === EntityType.Controller)
      this.basePath = base || ctorName.toLowerCase().replace(/controller$/, '');

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

  private get tensil(): Tensil<Request, Response> {
    return this._core.entities.Tensil as Tensil<Request, Response>;
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

  filter(filters: IFilters): this;
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

  route(routes: IRoutes): this;
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
