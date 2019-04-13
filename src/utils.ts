
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

  let parts: any = line.split(' ');
  parts[1] = parts[1].split(':');

  const result = {
    name: (err as Error).name,
    message: (err as Error).message,
    source: line,
    function: parts[0],
    filepath: parts[1][0],
    filename: '',
    line: parseInt(parts[1][1]),
    column: parseInt(parts[1][2]),
    ministack: '',
    stack: (err as Error).stack
  };

  result.filename = result.filepath.replace(/^\//, '').split('/').pop();
  result.ministack = `(${result.filename}:${result.line}:${result.column})`;

  return result;

}
