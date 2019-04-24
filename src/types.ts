import { Express, NextFunction, Request, Response, Router } from 'express';
import { Entity } from './entity';

export enum ENTITY_TYPES {
  Service = 'Service',
  Controller = 'Controller'
}

export type Filter = string | Function;
export type Policy = string | boolean | Function;
export type Action = string | Function;

export type RequestHandler = (req?: IRequest, res?: IResponse, next?: NextFunction) => any;
export type RequestErrorHandler = (err: Error, req?: IRequest, res?: IResponse, next?: NextFunction) => any;
export type RequestParamHandler = (req: IRequest, res: IResponse, next: NextFunction, param: any) => any;

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

export interface IActions {
  [action: string]: RequestHandler | RequestErrorHandler | RequestParamHandler;
}

export interface IEntities {
  [entity: string]: Entity;
}

export interface IRouters {
  [router: string]: Router;
}

export interface IRequest extends Request {
  [key: string]: any;
}

export interface IResponse extends Response {
  [key: string]: any;
}

export interface IOptionsBase {
  policies?: IPolicies;
  filters?: IFilters;
  routes?: IRoutes;
  actions?: IActions;
  app?: Express;
}

export interface IConfig extends IOptionsBase {
  type: string;
}

export interface IOptions extends IOptionsBase { }
