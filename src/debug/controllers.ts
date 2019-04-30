import tensil, { IPolicies, filter, action, Controller, HttpMethod, IRoutes, route } from '../';
import { Request, Response } from 'express';
import users from './data';

export class UserController extends Controller {

  policies: IPolicies = {
    find: 'log'
  };

  routes: IRoutes = {
    '/test/defined': (req, res, next) => res.send('test-defined')
  };

  @filter
  log(req, res, next) {
    console.log(`[TENSIL]: REQ id ${Date.now()}`);
    next();
  }

  @action()
  find(req: Request, res: Response) {
    if (req.params.id)
      return res.json(users[req.params.id]);
    res.json(Object.keys(users).map(k => users[k]));
  }

  @action(HttpMethod.Post)
  create(req: Request, res: Response) {
    const nextId = parseInt(Object.keys(users).pop(), 10) + 1;
    users[nextId] = req.body;
    res.status(201).json(nextId);
  }

  @action(HttpMethod.Get, 'custom')
  createCustom(req, res) {
    res.send('custom');
  }

  @route(HttpMethod.Get, '/show/all')
  show(req, res, next) {
    res.send('show-all');
  }

}

const ctrl = new UserController('user', 'id');

ctrl.route('/test/method', (req, res, next) => {
  res.send('test-method');
});

ctrl.route('view /routes/list', 'routes/list');
ctrl.route('redirect /routes/map', '/routes/list');
