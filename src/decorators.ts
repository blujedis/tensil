import { castArray, isPlainObject, isString } from 'lodash';
import { HttpMethod, EntityType, Filter, Descriptor, IGenerateRouteConfig, DecoratorType } from './types';

/**
 * Helper function to convert decorator params to array of config objects.
 * 
 * @private
 */
function normalizeDecorator(target: any, key: string,
  methodsOrConfigs: HttpMethod | HttpMethod[] | IGenerateRouteConfig[],
  path: string, filters: Filter | Filter[] = [], type: DecoratorType = DecoratorType.Action) {

  let methods: HttpMethod[];
  let configs: Partial<IGenerateRouteConfig>[];

  const template = (path && !/^\//.test(path) && path) || undefined;

  // Set the default path.
  path = template ? '' : path;

  if (Array.isArray(methodsOrConfigs) && isPlainObject(methodsOrConfigs[0])) {
    configs = methodsOrConfigs as IGenerateRouteConfig[];
    methodsOrConfigs = undefined;
  }
  else {
    methods = (methodsOrConfigs && castArray(methodsOrConfigs as HttpMethod)) || undefined;
    configs = [
      {
        methods,
        filters,
        template,
        path
      }
    ];
  }

  configs = configs.map(c => {
    c.key = c.key || key;
    c.methods = castArray(c.methods || [HttpMethod.Get]);
    c.decorator = type;
    c.path = c.path || '';
    c.filters = castArray(c.filters || []);
    return c;
  });

  return configs;

}

/**
 * Adds method as filter in Service or Controller filters collection.
 * 
 * @example
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
 * 
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
export function filter(target: any, key: string, descriptor: PropertyDescriptor) {

  const isFunc = descriptor.value && typeof descriptor.value === 'function';

  if (!isFunc)
    throw new Error(`Cannot set "filter" decorator on ${key}`);

  target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
  target.constructor.__INIT_DATA__.filters = target.constructor.__INIT_DATA__.filters || {};
  target.constructor.__INIT_DATA__.filters[key] = key;

  return descriptor;

}

/**
 * Creates action route with Http Method Get
 * 
 * @example
 * .action();
 * find(req, res, next) {
 *    // handle request.
 * }
 */
export function action(): Descriptor;

/**
 * Creates an action route for each specified Http method.
 * 
 * @example
 * .action(HttpMethod.Get, '/some/path');
 * .action([HttpMethod.Get, HttpMethod.Post], '/some/path');
 * find(req, res, next) {
 *    // handle request.
 * }
 * 
 * @param methods the Http Methods to apply to each route.
 * @param path the path or template to be used, paths begin with /
 */
export function action(methods?: HttpMethod | HttpMethod[], pathOrTemplate?: string): Descriptor;
export function action(methods?: HttpMethod | HttpMethod[], pathOrTemplate?: string) {

  if (methods === HttpMethod.Param)
    throw new Error('Whoops method "Param" is not valid for action decorator, did you mean to use "@param()"?');

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    const baseType = Object.getPrototypeOf(target).constructor.name;
    const isCtrl = baseType === EntityType.Controller;

    if (!isFunc || !isCtrl)
      throw new Error(`Cannot set "action" decorator on ${key}, is this a method and controller?`);

    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.actions = target.constructor.__INIT_DATA__.actions || {};
    target.constructor.__INIT_DATA__.actions[key] = normalizeDecorator(target, key, methods, pathOrTemplate);

    return descriptor;

  };

}

/**
 * Creates multiple routes defined by array of configs.
 * 
 * @example
 * .route([
 *   { method: HttpMethod.Get, path: '/some/path' },
 *   { method: HttpMethod.Get, path: '/some/other/path' },
 * ]);
 * 
 * @param routes route configuration objects.
 */
export function route(methods: IGenerateRouteConfig[]): Descriptor;

/**
 * Creates route for each specified Http method.
 * 
 * @example
 * .route(HttpMethod.Get, '/some/path');
 * .route([HttpMethod.Get, HttpMethod.Post], '/some/path');
 * 
 * @param methods the Http Methods to apply to each route.
 * @param path a custom path to use for the route.
 */
export function route(methods: HttpMethod | HttpMethod[],
  path?: string, filters?: Filter | Filter[]): Descriptor;

export function route(methods: HttpMethod | HttpMethod[] | IGenerateRouteConfig[],
  path?: string, filters?: Filter | Filter[]) {

  if (methods === HttpMethod.Param)
    throw new Error('Whoops method "Param" is not valid for action decorator, did you mean to use "@param()"?');

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    const isFunc = descriptor.value && typeof descriptor.value === 'function';

    if (!isFunc)
      throw new Error(`Cannot set "router" decorator on ${key}, is this a method?`);

    if (isString(methods) && !path)
      path = `/${key}`;

    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.routes = target.constructor.__INIT_DATA__.routes || {};
    target.constructor.__INIT_DATA__.routes[key] =
      normalizeDecorator(target, key, methods, path, filters, DecoratorType.Route);

    return descriptor;

  };

}
