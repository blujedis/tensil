import { NextFunction, Request, Response, Router } from 'express';
import { Entity } from './entity';
import { Tensil, Service, Controller } from './tensil';

export enum EntityType {
  Controller = 'Controller',
  Service = 'Service'
}

export enum ContextType {
  policies = 'policies',
  filters = 'filters',
  routes = 'routes'
}

export type ContextTypes = keyof typeof ContextType;

export type Constructor<T = {}> = new (...args: any[]) => T;

export type Filter = string | Function | any[];
export type Policy = string | boolean | Function | any[];
export type Action = string | Function;

export type RequestHandler<R extends Request, S extends Response> =
  (req?: R, res?: S, next?: NextFunction) => any;

export type RequestErrorHandler<R extends Request, S extends Response> =
  (err: Error, req?: R, res?: S, next?: NextFunction) => any;

export type RequestParamHandler<R extends Request, S extends Response> =
  (req: R, res: S, next: NextFunction, param: any) => any;

export type EntityExtended =
  Entity & { name?: string, filters: IFilters, routes: IRoutes, policies?: IPolicies, generate?: boolean };

export interface IMap<T> {
  [name: string]: T;
}

export interface IFilters {
  [filter: string]: Filter | Filter[];
}

export interface IPolicies {
  [policy: string]: Policy | Policy[];
}

export interface IRoutes {
  [route: string]: Filter | Filter[] | Action | Action[];
}

export interface IActions<R extends Request, S extends Response> {
  [action: string]: RequestHandler<R, S> | RequestErrorHandler<R, S> | RequestParamHandler<R, S>;
}

export interface IEntities {
  [entity: string]: Entity | Service | Controller | Tensil<Request, Response>;
}

export interface IRouters {
  [router: string]: Router;
}
