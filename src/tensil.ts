import { Express, Router } from 'express';
import { Entity } from './entity';
import { isBoolean, get, isString, castArray, isUndefined, uniq } from 'lodash';
import { IPolicies, IFilters, IRoutes, IActions, IConfig } from './types';


class Service extends Entity {

  filters: IFilters;
  routes: IRoutes;

  constructor();
  constructor(mount: string);
  constructor(name: string, mount: string);
  constructor(name?: string, mount?: string) {
    super(mount && name || name, mount, 'service');
  }

}

class Controller extends Entity {

  policies: IPolicies;
  filters: IFilters;
  routes: IRoutes;
  actions: IActions;

  constructor();
  constructor(mount: string);
  constructor(name: string, mount: string);
  constructor(name?: string, mount?: string) {
    super(mount && name || name, mount, 'controller');
  }

}

export class Tensil extends Entity {

  static Service: typeof Service;
  static Controller: typeof Controller;

  constructor()
  constructor(app: Express)
  constructor(app?: Express) {
    super(undefined, undefined, 'tensil', app);
  }

  protected normalizeNamespaces(entity: Entity, context: 'policies' | 'filters' | 'routes') {

    const map = entity[context];
    const entityName = entity.name;

    for (const k in map) {

      // Ensure is an array if not bool.
      if (!isBoolean(map[k])) {

        map[k] = castArray(map[k]).reduce((a, c) => {

          if (isString(c)) {

            // When string normalize the namespace.
            const parts = c.split('.');

            if (parts.length === 1 || parts[0] === 'this') {

              if (parts[0] === 'this')
                parts.shift();

              c = [entityName, ...parts].join('.');

            }

          }

          return [...a, c];

        }, []);

      }

    }

  }

  protected lookupHandler(namespace: string, context: string) {

    const entities = this._core.entities;

    const parts = namespace.split('.');
    const entityName = parts.shift() || '';
    const entity = entities[entityName];

    // Ensure entity exists.
    if (!entity)
      throw new Error(`Entity ${entityName || 'undefined'} is required but could not be found`);

    let result;

    // Check if contains key.
    if (parts[0] === context)
      parts.shift();

    // Check if class contains handler.
    result = get(entity, parts.join('.'));

    // If result is undefined fallback to context.
    if (!result)
      result = get(entity[context], parts.join('.'));

    return result;

  }

  protected normalizeHandlers(handlers: any, context: string): Function[] {

    return castArray(handlers || []).reduce((result, handler) => {

      // Lookup the filter.
      if (isString(handler)) {

        const lookup = this.lookupHandler(handler, context);

        if (!lookup)
          throw new Error(`${handler} filter is required but could not be found`);

        // Recurse ensure all handlers in lookup filter.
        const normalized = this.normalizeHandlers(lookup, context);

        result = [...result, ...normalized];

      }
      else {
        result = [...result, handler];
      }

      return result;

    }, []);

  }

  protected normalizeEntity(entity: Entity) {

    ['filters', 'policies', 'routes'].forEach((type: any) => {

      this.normalizeNamespaces(entity, type);

      for (const key in entity[type]) {
        let handlers = entity[type][key];
        if (isUndefined(handlers))
          continue;
        handlers = this.normalizeHandlers(handlers, type);
        entity[type][key] = handlers;
      }

    });

  }

  get routers() {
    return this._core.routers;
  }

  normalize() {

    let entities = this._core.entities;

    for (const k in entities) {
      this.normalizeEntity(entities[k]);
    }

    return this;

  }

  mount() {
    const mountPoints = Object.keys(this.routers).filter(v => v !== '/').sort();
    mountPoints.forEach(mount => {
      this.app.use(mount, this.routers[mount]);
    });
    return this;
  }

  init(strict: boolean = false) {

    this
      .normalize()
      .mount();

    return this;

  }

}

Tensil.Service = Service;
Tensil.Controller = Controller;





