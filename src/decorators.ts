import { castArray } from 'lodash';
import { HttpMethod, EntityType } from './types';

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

export function action(): Descriptor;
export function action(methods: HttpMethod | HttpMethod[], path: string): Descriptor;
export function action(methods?: HttpMethod | HttpMethod[], path: string = '') {

  return (target: any, key: string, descriptor: PropertyDescriptor) => {

    if (methods) {
      if (!path)
        throw new Error(`Decorator "${key}" cannot be defined, path is missing`);
      path = (castArray(methods).join('|') + ' ' + path).trim();
    }

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
