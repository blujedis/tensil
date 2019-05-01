import tensil, { IPolicies, filter, action, Controller, HttpMethod, IRoutes, route } from '../';
import { Request, Response } from 'express';
import users from './data';

export class UserController extends Controller {

  policies: IPolicies = {
    find: ['log', 'log2']
  };

  routes: IRoutes = {
    '/test/defined': (req, res, next) => res.send('test-defined')
  };

  @filter
  log(req, res, next) {
    next();
  }

  @filter
  log2(req, res, next) {
    next();
  }

  @action()
  find(req: Request, res: Response) {
    if (req.params.id)
      return res.json(users[req.params.id]);
    res.json(Object.keys(users).map(k => users[k]));
  }

  @action()
  create(req: Request, res: Response) {
    const nextId = parseInt(Object.keys(users).pop(), 10) + 1;
    users[nextId] = req.body;
    res.status(201).json(nextId);
  }

  @action(HttpMethod.Get, '/custom')
  createCustom(req, res) {
    res.send('custom');
  }

  @route(HttpMethod.Get, '/show/all')
  show(req, res, next) {
    res.send('show-all');
  }

  // @route([
  //   { method: HttpMethod.Get, path: '' }
  // ])

  @route([
    { method: HttpMethod.Get },
    { method: HttpMethod.Post, path: '/other', filters: [] }
  ])
  multiple(req, res) {
    res.send('test-multiple');
  }

}

const ctrl = new UserController('user', 'id');

ctrl.route('/test/method', (req, res, next) => {
  res.send('test-method');
});

ctrl.route('view /routes/list', 'routes/list');
ctrl.route('redirect /routes/map', '/routes/list');
