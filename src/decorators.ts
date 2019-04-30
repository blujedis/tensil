import { castArray } from 'lodash';
import { HttpMethod, EntityType, Filter } from './types';

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

export type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

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
 * Creates action route using specified template.
 * 
 * @example
 * .action('my-template-name');
 * find(req, res, next) {
 *    // handle request.
 * }
 * 
 * @param template the template name from options.templates
 */
export function action(template: string | HttpMethod): Descriptor;

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
 * @param path a custom path to use for the route.
 */
export function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
export function action(methods?: string | HttpMethod | HttpMethod[], path: string = '') {

  methods = methods || [];

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    path = (castArray(methods as string).join('|') + ' ' + path).trim();

    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    const baseType = Object.getPrototypeOf(target).constructor.name;
    const isCtrl = baseType === EntityType.Controller;

    if (!isFunc || !isCtrl)
      throw new Error(`Cannot set "action" decorator on ${key}`);

    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.actions = target.constructor.__INIT_DATA__.actions || {};
    target.constructor.__INIT_DATA__.actions[key] = path;

    return descriptor;

  };

}

/**
 * Creates a route for each specified Http method.
 * 
 * @example
 * .action(HttpMethod.Get, '/some/path');
 * .action([HttpMethod.Get, HttpMethod.Post], '/some/path');
 * 
 * @param methods the Http Methods to apply to each route.
 * @param path a custom path to use for the route.
 */
export function route(methods: HttpMethod | HttpMethod[], path: string, filters?: Filter | Filter[]) {

  methods = methods || [];
  filters = castArray(filters || []);

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    path = (castArray(methods as string).join('|') + ' ' + path).trim();

    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    const baseType = Object.getPrototypeOf(target).constructor.name;
    const isCtrl = baseType === EntityType.Controller;

    if (!isFunc)
      throw new Error(`Cannot set "router" decorator on ${key}`);

    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.routes = target.constructor.__INIT_DATA__.routes || {};
    target.constructor.__INIT_DATA__.routes[key] = [...filters as any[], path];

    return descriptor;

  };

}
