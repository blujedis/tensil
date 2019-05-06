import { Router, Request, Response, NextFunction } from 'express';
import { Entity } from './entity';
import { Tensil, Service, Controller } from './tensil';

// ENUMS //

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
  Del = 'delete',
  Param = 'param'
}

export enum DecoratorType {
  Action = 'action',
  Route = 'route',
  Filter = 'filter'
}

export enum RouteType {
  Crud = 'crud',
  Rest = 'rest'
}

export type ValuesOf<T> = { [K in keyof T]: T[K] };

// ENUM LISTS //

export type EntityTypes = keyof typeof EntityType;
export type ContextTypes = keyof typeof ContextType;
export type DecoratorTypes = ValuesOf<DecoratorType>;
export type HttpMethods = ValuesOf<HttpMethod>;
export type RouteTypes = ValuesOf<RouteType>;

// MISC //

export type Constructor<T = {}> = new (...args: any[]) => T;
export type Noop = (...args: any[]) => void;
export type AwaiterResponse<T = any, K extends string = 'data'> = Promise<{ err?: Error } & Record<K, T>>;

// REQUEST HANDLERS //

export type RequestHandler<R, S> = (req: R, res: S, next?: NextFunction) => any;
export type RequestErrorHandler<R, S> = (err: Error, req: R, res: S, next: NextFunction) => any;
export type RequestParamHandler<R, S> = (req: R, res: S, next: NextFunction, param: any) => any;
export type RequestHandlers<R, S> = RequestHandler<R, S> | RequestErrorHandler<R, S> | RequestParamHandler<R, S>;

export type Filter<R extends Request = Request, S extends Response = Response> =
  string | RequestHandlers<R, S>;
export type Policy<R extends Request = Request, S extends Response = Response> =
  string | boolean | RequestHandlers<R, S>;
export type Action<R extends Request = Request, S extends Response = Response> =
  string | RequestHandlers<R, S>;

export type ContextHandlers<R extends Request = Request, S extends Response = Response> =
  Filter<R, S> | Policy<R, S> | Action<R, S>;

// DECORATORS //

export type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

export interface IGenerateConfigBase {
  key: string;
  methods: HttpMethod | HttpMethod[];
  decorator: DecoratorType;
}

export interface IGenerateActionConfig extends IGenerateConfigBase {
  template?: string;
}

export interface IGenerateRouteConfig extends IGenerateConfigBase {
  path: string;
  filters?: Policy | Policy[] | Filter | Filter[];
  [key: string]: any;
}

// CONFIG CONTEXTS //

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
  [action: string]: Action | Action[];
}

export interface IEntities {
  [entity: string]: Service | Controller | Tensil | Entity;
}

export interface IRouters {
  [router: string]: Router;
}

// export interface IRoutesConfig {
//   [route: string]: Filter | Filter[] | Action | Action[] | IGenerateRouteConfig[];
// }

// export interface IActionsConfig {
//   [route: string]: string | IGenerateRouteConfig[];
// }

export interface IConfig {
  policies: IPolicies;
  filters: IFilters;
  routes: IGenerateRouteConfig[];
  actions: IGenerateRouteConfig[];
}

// ROUTING //

export interface IRouteConfig<R, S> {
  mount?: string;
  method: string;
  handlers: (RequestHandlers<R, S> & { __namespace__: string })[];
  isView?: boolean;
  isRedirect?: boolean;
  isParam?: boolean;
  entity: Service | Controller | Tensil | Entity;
  namespaces: string[]
}

export interface IRouteConfigs<R, S> {
  [route: string]: IRouteConfig<R, S>;
}

export interface IMethods<R, S> {
  [method: string]: IRouteConfigs<R, S>;
}

export interface IRouteMap<R extends Request = Request, S extends Response = Response> {
  [mount: string]: IMethods<R, S>;
}

// OPTIONS //

export interface ITheme {
  primary: string;
  accent: string;
}

export interface ITemplates {
  [action: string]: string;
}

export interface IOptions {

  templates?: ITemplates; // route formatting themes.
  formatter?: (type: RouteType, template: string, options: Partial<IGenerateActionConfig>) => string;
  themes?: { // theme colors passed to error.
    [theme: string]: ITheme;
  }
  rest?: boolean; // enable rest routes.
  crud?: boolean; // enable crud routes.
  sort?: boolean; // sorts routes before binding to routers.
  strict?: boolean; // when true duplicate routes/entities etc throw errors.

}

// HTTP ERROR EXTENDED //

export class HttpError extends Error {

  title: string;
  status: number;
  url: string;
  theme: ITheme;

  constructor(message: string, status: number, theme?: ITheme);
  constructor(message: string, status: number, title: string, theme?: ITheme);
  constructor(message: string, status: number, title?: string | ITheme, theme?: ITheme) {

    super(message);

    if (typeof title === 'object') {
      theme = title;
      title = undefined;
    }

    this.title = title as string;
    this.status = status;

    const defaultTheme: ITheme = {
      primary: '#1E152A',
      accent: '#444c99'
    };

    this.theme = { ...defaultTheme, ...theme };

  }

}
