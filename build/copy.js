const { copyFileSync, mkdirSync, existsSync } = require('fs');
const { resolve, join, basename } = require('path');

const files = ['./src/error.html|./dist/views'];

files.forEach(f => {
  const arr = f.split('|');
  const dir = resolve(arr[1]);
  const src = resolve(arr[0]);
  const dest = join(dir, basename(arr[0]));
  if (!existsSync(dir))
    mkdirSync(dir);
  copyFileSync(src, dest);
});
