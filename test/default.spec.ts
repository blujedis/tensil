import * as chai from 'chai';
import * as mocha from 'mocha';
import http = require('chai-http'); // required due to chai typings arrrrrggggh
import tensil from './server';

const assert = chai.assert;

chai.use(http);

describe('Tensil', () => {

  it('should verify route map keys', () => {
    assert.deepEqual(Object.keys(tensil.routeMap), ['/id', '/']);
    assert.deepEqual(Object.keys(tensil.routeMap['/id']), ['get', 'post']);
  });

  it('should request user from read method', (done) => {

    chai.request(tensil.server)
      .get('/id/user')
      .end((err, res) => {

        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.equal(res.body.length, 2);
        done();
      });

  });

  it('should request user by id', (done) => {

    chai.request(tensil.server)
      .get('/id/user/1')
      .end((err, res) => {
        assert.equal(res.status, 200);
        const { _isAuthenticated, ...body } = res.body;
        assert.deepEqual(body, {
          firstName: 'Milton',
          lastName: 'Waddams',
          username: 'milton@officespace.com',
          password: 'swingline',
          location: 'basement'
        });
        done();
      });

  });

  it('should request user by id check if auth by service filter', (done) => {

    chai.request(tensil.server)
      .get('/id/user/1')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body._isAuthenticated, true);
        done();
      });

  });

  it('should create user & return status 201 with id of 3', (done) => {

    chai.request(tensil.server)
      .post('/id/user')
      .send({
        firstName: 'Bill',
        lastName: 'Lumburgh',
        username: 'bill@officespace.com',
        password: 'emkay',
        location: 'roving'
      })
      .end((err, res) => {
        assert.equal(res.status, 201);
        assert.equal(res.body, 3);
        done();
      });

  });

  it('should test custom route in action decorator', (done) => {

    chai.request(tensil.server)
      .get('/id/user/custom')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'custom');
        done();
      });

  });

  it('should test custom route defind by method', (done) => {

    chai.request(tensil.server)
      .get('/id/user/test/method')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'test-method');
        done();
      });

  });

  it('should test custom route defined in class routes property', (done) => {

    chai.request(tensil.server)
      .get('/id/user/test/defined')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'test-defined');
        done();
      });

  });

  it('should test route decorator and return "show all"', (done) => {

    chai.request(tensil.server)
      .get('/id/user/show/all')
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'show-all');
        done();
      });

  });

  it('should test route decorator with filter requiring XHR', (done) => {

    chai.request(tensil.server)
      .get('/')
      .set('accept', 'text/html')
      .end((err, res) => {
        assert.equal(res.status, 406);
        done();
      });

  });

  after(() => {
    tensil.server.close();
  });

});
