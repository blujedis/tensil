# Tensil

Express server Service, Controller and Routing framework.

## Introduction

Tensil flexible and lightweight. It intentionally leaves out opinion and focuses on painless secure routing. The idea behind Tensil is flexibilty with just enough magic. Services and Controllers can be mounted to the root router or their own router for app segregation. 

## Install

```sh
$ npm install tensil -s
```

## Usage

```ts
import tensil, { Controller } from 'tensil';
import * as bodyParser from 'body-parser';

class MyController extends Controller {
  // See below for configuring Controllers & Services
  // Excluded here for clarity sake of how to wire up Tensil.
}

tensil.app.use(bodyParser.json());
tensil.app.use(bodyParser.urlencoded({ extended: true }));
tensil.app.use(bodyParser.text());
tensil.app.use(bodyParser.json({ type: 'application/json' }));

tensil
  .registerController(MyController)
  .start();

```

## With Custom App

Using Tensil with external express() app.

```ts
import tensil from 'tensil';
import * as express from 'express';

const app = express();
tensil.app = app;
```

## With Http Server

Using Tensil with http.createServer

```ts
import tensil from 'tensil';
import * as express from 'express';

tensil.withServer();

// OR
tensil.withServer(express());

// OR
tensil.withServer({ options });

// OR with SSL
tensil.withServer({ options }, true); // 
```

## Server

Configuring a Tensil Service.

```ts
import tensil, { filter, Service } from 'tensil';
import { format } from 'util';

class MyService extends Service {

  filters: {
    canCreate: ['log', 'isAuthorized']
  }

  private formatMessage(message, ...args) {
    return format(message, args);
  }

  @filter
  log(req, res, next) {
    // Log a message when this filter is hit.
    console.log(this.formatMessage('Request id', 123456));
    next();
  }

  @filter
  isAuthorized(req, res, next) {
    if ('authorized')
      return next();
    res.status(403).send();
  }

}

const myService = new MyService();
// OR
tensil.registerSerivce(MyService);
```

## Controller

Configuring a Tensil Controller.

```ts
import tensil, { action, HttpMethod } from 'tensil';
class MyController extends Tensil.Controller {

  // When a custom route or generated route
  // calls "MyController.create" as it's action method
  // the MyService filter "canCreate" is injected.

  // The result would be as if you did the following manually:
  // app.post('/user/:id?, ['Myservice.log', 'Myservice.isAuthorized', 'MyController.create'])

  policies: {
    create: ['MyService.filters.canCreate'] // 
  }
  
  // or use HttpMethod.Get 
  // or template defined in options like "find"
  // or define with path @action('get', '/some/path/:id?')
  @action() 
  find(req, res) {
    // find a record.
    res.json({});
  }

  @action(HttpMethod.Post) 
  create(req, res) {
    // create a record
    res.status(201).json({})
  }

}

const myController = new MyController('user');
// OR
tensil.registerController(MyController, 'user');
```

## Default Action Templates

Templates allow you to map your action decorators to a key to make the defining of generated routes for controller actions less verbose. You can always override and defined a specific path. 

Simply define a template below then use as:

```ts
@action('my-template-name')
create(req, res) {
  //
}
```

```ts
const options = {
  templates: {
   get: 'get /{{action}}',
   put: 'put /{{action}}/:id?',
   post: 'post /{{action}}',
   del: 'delete /{{action}}/:id?',
   find: 'get /{{action}}/:id?',
   create: 'post /{{action}}',
   update: 'put /{{action}}/:id?',
   delete: 'delete /{{action}}/:id?',
  }
  formattter: (key, path, type) => {
    // override default formatter function
    // to handle formatting of above templates
    // by default rest routes remove {{action}}
  }
  rest: true,
  crud: false

}
```

## Events

A pipe "**|**" indicates or. By default all errors are emitted without halting by throwing an error. When <code>options.strict</code> is enabled then errors will be thrown. Note when NOT **prodcution** strict is automatically enabled when strict is undefined. This is done to ensure there are not duplicate registrations and routes in a production environment.

Listening to all events for a given group.

```ts
tensil.on(`route`, (type, ...args) => {
  // do something with route.
});
```

To listen to a specific event type you combine the event with the type separated by a colon. When listening to a specific event type the **type** is removed from the first argument.

```ts
tensil.on(`route:mounted`, (...args) => {
  // do something with route.
});
```

You can also listen to ALL events as follows:


```ts
tensil.on(`*`, (event, type, ...args) => {
  // do something with event.
});
```

<table>
    <caption>Tensil Events</caption>
    <tr><th>Event</th><th>Type</th><th>Value1</th><th>Value2</th></tr>
    <tr><td>entity</td><td>duplicate</td><td>Error</td><td></td></tr>
    <tr><td>policy</td><td>invalid</td><td>Error</td><td></td></tr>
    <tr><td>filter</td><td>invalid</td><td>Error</td><td></td></tr>
    <tr><td>route</td><td>duplicate</td><td>Error</td>x<td></td></tr>
    <tr><td>route</td><td>invalid</td><td>Error</td><td></td></tr>
    <tr><td>entity</td><td>registered</td><td>Service | Controller</td><td></td></tr>
    <tr><td>policy</td><td>create</td><td>IPolicy | IPolicies</td><td></td></tr>
    <tr><td>filter</td><td>create</td><td>IFilter | IFilters }</td><td></td></tr>
    <tr><td>route</td><td>create</td><td>IRoute | IRoutes</td><td></td></tr>
    <tr><td>route</td><td>registered</td><td>path: string</td><td>IRouteConfig'<'Request, Response'>'</td></tr>
    <tr><td>route</td><td>mounted</td><td>path: string</td><td>IRouteConfig'<'Request, Response'>'</td></tr>
    <tr><td>mount</td><td>completed</td><td>null</td><td></td></tr>
    <tr><td>init</td><td>completed</td><td>null</td><td></td></tr>
    <tr><td>start</td><td>completed</td><td>null</td><td></td></tr>

</table>

## Docs

See [https://blujedis.github.io/tensil/](https://blujedis.github.io/tensil/)

## Change

See [CHANGE.md](CHANGE.md)

## License

See [LICENSE.md](LICENSE)

