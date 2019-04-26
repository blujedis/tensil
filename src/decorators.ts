
export function filter(target: any, key: string, descriptor: PropertyDescriptor) {

  const isFunc = descriptor.value && typeof descriptor.value === 'function';

  if (!isFunc)
    return descriptor;

  target.constructor.__INIT_DATA__ = target.constructor.__INIT_DATA__ || {};
  target.constructor.__INIT_DATA__.filters = target.constructor.__INIT_DATA__.filters || {};
  target.constructor.__INIT_DATA__.filters[key] = key;

  return descriptor;

}
