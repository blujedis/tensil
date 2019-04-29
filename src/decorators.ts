import { castArray } from 'lodash';
import { HttpMethod, EntityType } from './types';

/**
 * Adds method as filter in Service or Controller filters collection.
 * 
 * @example
 * class UserService {
 *  @filter
 *  isAuthorized(req, res, next) {
 *    // check if authorized.
 *  }
 * }
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
 * Adds method as filter in Service or Controller filters collection.
 * Accepts an Http Method or Methods or a template name as the first argument.
 * A path argument can be passed to statically define the action's path.
 * 
 * @example
 * class UserController {
 *  @action('create')
 *  create(req, res, next) {
 *    // check if authorized.
 *  }
 * }
 * 
 * @param target the target class instance.
 * @param key the method name the decorator is bound to.
 * @param descriptor the property descriptor for the bound method.
 */
export type Descriptor = (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

export function action(): Descriptor;
export function action(template: string): Descriptor;
export function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
export function action(methods?: string | HttpMethod | HttpMethod[], path: string = '') {

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    if (methods)
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

export function route(methods: HttpMethod | HttpMethod[], path: string) {

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    if (methods)
      path = (castArray(methods as string).join('|') + ' ' + path).trim();

    const isFunc = descriptor.value && typeof descriptor.value === 'function';
    const baseType = Object.getPrototypeOf(target).constructor.name;
    const isCtrl = baseType === EntityType.Controller;

    if (!isFunc || !isCtrl)
      throw new Error(`Cannot set "action" decorator on ${key}`);

    target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
    target.constructor.__INIT_DATA__.actions = target.constructor.__INIT_DATA__.routes || {};
    target.constructor.__INIT_DATA__.actions[key] = path;

    return descriptor;

  };

}
