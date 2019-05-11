import * as express from 'express';
import { Express } from 'express';
import { has } from 'lodash';
import { IEntities, IRouters } from './types';
import { Controller, Service, Tensil } from './tensil';
import { Entity } from './entity';

// templateSettings.interpolate = /{{([\s\S]+?)}}/g;

export class Core {

  private static _instance: Core;

  static getInstance(app?: Express): Core {

    return (this._instance || (this._instance = new this(app))) as any;
  }

  app: Express;
  entities: IEntities = {};
  routers: IRouters = {};

  constructor(app?: Express) {

    this.app = app || (express() as Express);
    this.routers['/'] = this.app;

    // Define singleton instance.
    Core._instance = this;

  }

  /**
   * Gets the prototypeOf name for the provided Entity class.
   * 
   * @example
   * .getType(UserController);
   * 
   * @param entity the Entity to get prototype name for.
   */
  getType(entity: Service | Controller | Entity) {
    const type = Object.getPrototypeOf(Object.getPrototypeOf(entity)).constructor.name;
    // if (type !== 'Service' && type !== 'Controller')
    //   return this.getType((entity as any).constructor.prototype);
    // console.log((entity as any).__proto__.constructor.__proto__.constructor.__proto__);
    return type;
  }

  /**
   * Checks if core has already registered the entity.
   * 
   * @param type the entity type name.
   */
  has(type: string): boolean;

  /**
   * Checks if core has already registered the entity.
   * 
   * @param Entity the Entity instance.
   */
  has(Entity: Service | Controller | Entity | Tensil): boolean;
  has(entity: string | Service | Controller | Entity | Tensil) {
    let type = entity as string;
    if (typeof entity !== 'string')
      type = entity.type;
    return has(this.entities, type);
  }

  /**
   * Registers an Entity instance with the Tensil Entities collection.
   * 
   * @example
   * .registerInstance(UserController);
   * 
   * @param entity the Entity instance to register with Tensil.
   */
  registerInstance(entity: Service | Controller | Entity | Tensil) {
    if (this.has(entity))
      return false;
    this.entities[entity.type] = entity;
    return true;
  }

}
