import tensil from '../tensil';
import './entities';

// tensil.on('route', (type, val) => {
//   console.log(type);
// });

function showRoutes() {
  Object.keys(tensil.routeMap).forEach(mount => {
    console.log();
    console.log('Router:                       ', mount === '/' ? 'default' : mount);
    console.log('---------------------------------------');
    Object.keys(tensil.routeMap[mount]).forEach(method => {
      console.log('');
      console.log('  ' + method);
      Object.keys(tensil.routeMap[mount][method]).forEach(route => {
        console.log('    ' + route);
      });
    });
  });
  console.log();
}

tensil.start(() => {
  console.log('Running');
  // showRoutes();
});
