import { castArray, isString } from 'lodash';

export function parseCaller(err?: string | number | Error, split?: number) {

  let message = '';

  if (typeof err === 'string') {
    message = err;
    err = undefined;
  }

  if (typeof err === 'number') {
    split = err;
    err = undefined;
  }

  if (err && !split)
    split = 1;

  err = err || new Error(message);
  let line = (err as Error).stack.split('\n')[split || 2];

  const idx = line.indexOf('at ');
  line = line.slice(idx + 2, line.length).trim().replace(/\(|\)/, '');

  const parts: any = line.split(' ');
  parts[1] = parts[1].split(':');

  const result = {
    name: (err as Error).name,
    message: (err as Error).message,
    source: line,
    function: parts[0],
    filepath: parts[1][0],
    filename: '',
    line: parseInt(parts[1][1], 10),
    column: parseInt(parts[1][2], 10),
    ministack: '',
    stack: (err as Error).stack
  };

  result.filename = result.filepath.replace(/^\//, '').split('/').pop();
  result.ministack = `(${result.filename}:${result.line}:${result.column})`;

  return result;

}

export function parseRoute(route, handlers) {

  const parts = route.split(' ');

  let method = 'get';
  let methods = [];
  let path = parts[0];

  if (parts.length > 1) {
    path = parts[1].toLowerCase();
    methods = parts[0].toLowerCase().split('|');
    method = methods.shift();
  }

  // Normalize starting '/' and remove trailing '/';
  path = '/' + path.replace(/^\//, '').replace(/\/$/, '');

  handlers = castArray(handlers);

  // When view handler may be a view path.
  // Check if exists in handlers if not assume path.
  if (method === 'view') {
    method = 'get';
    if (isString(handlers[0])) {
      // const fn = get(policy, viewHandler);
      // Converting
      // view /some/path: 'view_name' to:
      // get /some/path: [handler, view_name]
      // handlers[0] = [fn, handlers[0]];
    }
  }

  if (method === 'param') {
    method = 'get';
    if (isString(handlers[0])) {
      // const fn = get(policy, paramHandler);
      // let paramPath = mount.length ? join(mount, path) : path;
      // paramPath = '/' + paramPath.replace(/^\//, '');
      // handlers[0] = [fn, paramPath];
    }
  }

}
