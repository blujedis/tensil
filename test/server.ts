
import tensil from '../src';
import * as bodyParser from 'body-parser';

// Import debug files.
import '../src/debug/entities';

const server = tensil.withServer();
const app = tensil.app;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/json' }));

tensil
  // .registerController(UserController, 'user', '/id')
  .start(1234);

export default tensil;
