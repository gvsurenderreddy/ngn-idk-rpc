// Include NGN (locally)
var assert = require('assert'),
    path = require('path');

UTIL.testing = true;

/**
 * Make sure the NGN Utilities namespace is available.
 */
suite('IDK RPC Sanity Test', function(){

  var lib = null;
  /*setup(function(){

  });*/

  test('NGN.rpc.Client exists.', function(){
    assert.ok(NGN.rpc.Client !== undefined,'NGN.rpc.Client load failure.');
  });
  test('NGN.rpc.Server exists.', function(){
    assert.ok(NGN.rpc.Server !== undefined,'NGN.rpc.Server load failure.');
  });
  test('new NGN.rpc.Client() constructed.', function(){
    assert.ok(new NGN.rpc.Client({
      host: 'localhost',
      port: 4000,
      autoConnect:false
    }) !== undefined);
  });
  test('new NGN.rpc.Server() constructed.', function(){
    assert.ok(new NGN.rpc.Server() !== undefined);
  });

});

//TODO: Functional Tests - Client/Server communication