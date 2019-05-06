
export type RunnerResult<T> = T[] | { [key: string]: T };
export type RunnerCallback<T> = (err: Error | Error[], results: RunnerResult<T>) => void;
export type RunnerEvents = Function[] | { [key: string]: Function };

/**
 * Runs events in parallel return results.
 * 
 * @example
 * runner({
 *    one: function (cb) {
 *       setTimeout(() => { cb(null, 1); })
 *    },
 *    two: function (cb) {
 *       setTimeout(() => { cb(new Error(`Error on item 2`)); })
 *    },
 *    three: function (cb) {
 *       setTimeout(() => { cb(null, 3); })
 *    }
 * });
 * 
 * @param events an array of functions to run or any indexed object of functions.
 * @param done callback on event runner finished.
 */
function runner<T>(events: RunnerEvents, done: RunnerCallback<T>): void;

/**
 * Runs events in parallel return results.
 * 
 * @example
 * runner([
 *    function (cb) {
 *       setTimeout(() => { cb(null, 1); })
 *    },
 *    function (cb) {
 *       setTimeout(() => { cb(new Error(`Error on item 2`)); })
 *    }
 *    function (cb) {
 *       setTimeout(() => { cb(null, 3); })
 *    }
 * ]);
 * 
 * @param events an array of functions to run or any indexed object of functions.
 * @param onErrorHalt when true runner will exit when error is detected (default: false)
 * @param done callback on event runner finished.
 */
function runner<T>(events: RunnerEvents, onErrorHalt: boolean | RunnerCallback<T>, done: RunnerCallback<T>): void;
function runner<T>(events: RunnerEvents, onErrorHalt: boolean | RunnerCallback<T>, done?: RunnerCallback<T>): void {

  if (arguments.length === 2) {
    done = onErrorHalt as RunnerCallback<T>;
    onErrorHalt = undefined;
  }

  // Halt on error by default.
  onErrorHalt = typeof onErrorHalt === 'undefined' ? false : onErrorHalt;

  let results: RunnerResult<T>;
  const errors = [];
  let queued: number;
  let keys;
  let isSync = true;

  function finished(err: Error[]) {

    function end() {

      if (done)
        done(onErrorHalt ? err.shift() : errors, results);

      done = null;

    }

    if (isSync)
      process.nextTick(end);

    else
      end();

  }

  function each(i: number, err: Error, result: T) {

    results[i] = result;

    if (err)
      errors.push(err);

    if (--queued === 0 || (err && onErrorHalt))
      finished(errors);

  }

  if (Array.isArray(events)) {
    results = [];
    queued = events.length;
  }

  else {
    keys = Object.keys(events);
    results = {};
    queued = keys.length;
  }

  // All done.
  if (!queued) {
    finished(null);
  }

  // Iterating Object.
  else if (keys) {

    keys.forEach((k) => {

      events[k]((err: Error, result: T) => {
        each(k, err, result);
      });

    });

  }

  // Iterating Array.
  else {

    (events as any[]).forEach((task: Function, i: number) => {

      task((err: Error, result: T) => {
        each(i, err, result);
      });

    });

  }

  isSync = false;

}
