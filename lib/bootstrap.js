global.NGN = {};
module.exports = function(ngn){
  NGN = ngn;
  return {
    rpc: {
      Client: require('./rpc/Client'),
      Server: require('./rpc/Server')
    }
  };
};