import { Router, Express } from 'express';
import { Entity } from './entity';
import { Tensil, Service, Controller } from './tensil';

export enum EntityType {
  Controller = 'Controller',
  Service = 'Service'
}

export enum ContextType {
  policies = 'policies',
  filters = 'filters',
  routes = 'routes',
  actions = 'actions'
}

export enum HttpMethod {
  Get = 'get',
  Put = 'put',
  Post = 'post',
  Del = 'delete'
}

export type ContextTypes = keyof typeof ContextType;
export type Constructor<T = {}> = new (...args: any[]) => T;
export type Noop = (...args: any[]) => void;

export type Filter = string | Function | any[];
export type Policy = string | boolean | Function | any[];
export type Action = string | Function;

// export type RequestHandler<R extends Request, S extends Response> =
//   (req?: R, res?: S, next?: NextFunction) => any;

// export type RequestErrorHandler<R extends Request, S extends Response> =
//   (err: Error, req?: R, res?: S, next?: NextFunction) => any;

// export type RequestParamHandler<R extends Request, S extends Response> =
//   (req: R, res: S, next: NextFunction, param: any) => any;

export interface IFilters {
  [filter: string]: Filter | Filter[];
}

export interface IPolicies {
  [policy: string]: Policy | Policy[];
}

export interface IRoutes {
  [route: string]: Filter | Filter[] | Action | Action[];
}

export interface IRouteMap {
  [mount: string]: {
    [method: string]: {
      [path: string]: Function[]
    }
  }
}

export interface IActions {
  [action: string]: string;
}

export interface IEntities {
  [entity: string]: Service | Controller | Tensil | Entity<any, any>;
}

export interface IRouters {
  [router: string]: Router;
}

export interface IConfig {
  policies: IPolicies;
  filters: IFilters;
  routes: IRoutes;
  actions: IActions;
}

export interface IOptions {
  templates?: IActions;
  formatter?: (key: string, path: string, type: 'rest' | 'crud') => string;
  rest?: boolean; // enable rest routes.
  crud?: boolean; // enable crud routes.
  sort?: boolean; // sorts routes before binding to routers.
}
