import * as express from 'express';
import { Express } from 'express';
import { Entity } from './entity';
import { has } from 'lodash';
import { IEntities, IRouters, EntityExtended } from './types';

// templateSettings.interpolate = /{{([\s\S]+?)}}/g;

export class Core {

  private static _instance: Core;

  static getInstance(app?: Express) {
    return this._instance || (this._instance = new this(app));
  }

  // PLACEHOLDER

  // config = {
  //   program: 'Tensil',
  //   messageTemplate: `{{program}} {{message}}`
  // };

  app: Express;
  entities: IEntities = {};
  routers: IRouters = {};

  constructor(app?: Express) {

    this.app = app || express();
    this.routers['/'] = this.app;

    // Define singleton instance.
    Core._instance = this;

  }

  // PLACEHOLDER

  // formatMessage(message: string, map?: IMap<any>) {
  //   message = template(message)(map || {});
  //   const caller = parseCaller(3);
  //   return template(this.config.messageTemplate)
  // ({ program: this.config.program, ministack: caller.ministack, message });
  // }

  getType(entity: Entity | EntityExtended) {
    return Object.getPrototypeOf(Object.getPrototypeOf(entity)).constructor.name;
  }

  registerInstance(entity: Entity) {
    if (has(this.entities, entity.type))
      throw new Error(`Entity ${entity.type} failed to register, already exists`);
    this.entities[entity.type] = entity;
    return this;
  }

}
