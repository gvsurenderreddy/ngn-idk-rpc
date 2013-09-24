var axon = require('axon'),
    rpc = require('ngn-axon-rpc'),
    req = axon.socket('req'),
    _client = new rpc.Client(req),
    _connected = false,
    _connecting = false,
    _methods = {};

// A private function for extracting namespaced methods
var getMethodTree = function(obj,scope){

  scope = Array.isArray(scope) == true ? scope : (typeof scope == 'string' ? [scope] : []);

  // If the object is a function, construct the appropriate
  if (obj.hasOwnProperty('name') && obj.hasOwnProperty('params')){
    return function(){
      var args = Array.prototype.slice.call(arguments),
          _fn = args.pop(),
          _mthd = scope.slice(0);
          //_mthd.push(obj.name);
          _mthd = _mthd.join('.');

      _client.call.apply(_client,[_mthd].splice(0).concat(args).concat([function(){
        if (arguments[0] instanceof Error){
          throw arguments[0];
        }
        _fn.apply(_fn,(arguments[0]==null&&arguments.length>1?Array.prototype.slice.call(arguments).splice(1,1):Array.prototype.slice.call(arguments)));
      }]));
    };
  } else {
    // If the object is a true object (i.e. namespace), add the tree
    var _obj = {};
    for (var attr in obj){
      var _scope = scope.slice(0);
      _scope.push(attr);
      _obj[attr] = getMethodTree(obj[attr],_scope.join('.'));
    }
    return _obj;
  }
};

/**
 * @class NGN.rpc.Client
 * The RPC client is a special TCP socket client that interacts with an
 * NGN.rpc.Server. Using this, it is possible to call functions remotely
 * or between disimilar processes.
 *
 * The NGN.rpc.Server is designed to expose a module remotely. Take the following
 * example:
 *
 * **server.js**
 *
 *     var controller = new NGN.rpc.Server({
 *       port: 4000,
 *       module: {
 *         sayHello: function(name,callback){
 *           callback(null,"Hello, "+name);
 *         },
 *         sayGoodbye: function(name,callback){
 *           callback(null,"Goodbye "+name);
 *         }
 *       }
 *     });
 *
 * **client.js**
 *
 *     var api = new NGN.rpc.Client({
 *       host: 'localhost',
 *       port: 4000
 *     });
 *
 *     api.sayHello(function(err,data){
 *       console.log(data);
 *     });
 *
 * @extends NGN.Class
 */
var Class = NGN.Class.extend({

  /**
   * @constructor
   * Create a HTTP/S server.
   */
  constructor: function(config){

    var me = this;

    config = config || {};

    Class.super.constructor.call( this, config );

    Object.defineProperties(this,{
      /**
       * @cfg {String} [host=localhost]
       * The hostname/IP where the NGN.rpc.Server is running.
       */
      host: {
        enumerable: true,
        writable: true,
        configurable: false,
        value: config.host || 'localhost'
      },

      /**
       * @cfg {Number} port (required)
       * The port number where the NGN.rpc.Server can be reached.
       */
      port: {
        enumerable: true,
        writable: true,
        configurable: false,
        value: config.port
      },

      /**
       * @property {Boolean} connected
       * Indicates whether the connection to the RPC server is active or not.
       * @readonly
       */
      connected: {
        enumerable: true,
        get: function(){
          return _connected;
        }
      },

      /**
       * @property {Boolean} connecting
       * Indicates a connection is being established.
       * @readonly
       */
      connecting: {
        enumerable: true,
        get: function(){
          return _connecting;
        }
      },

      /**
       * @cfg {Boolean} [autoConnect=true]
       * Connect automatically.
       */
      autoConnect: {
        enumerable: true,
        writable: true,
        configurable: false,
        value: NGN.coalesce(config.autoConnect,true)
      },

      _methods:{
        enumerable: false,
        writable: true,
        configurable: false,
        value: []
      }
    });

    var me   = this;

    this.on('start',function(){
      me.onReady();
    });

    if (this.autoConnect)
      this.connect();
  },

  /**
   * @method connect
   * Connect to the remote server.
   */
  connect: function(){
    if (this.connected){
      this.fireWarning('Connect failed because the client is already connected!');
      return;
    }

    var me = this;
    this.onConnecting();
    req.on('disconnect',function(){
      me.onDisconnect();
    });
    req.on('reconnect attempt',function(){
      me.onReconnect();
    });
    req.connect(this.port,this.host,function(){
      me.onConnect();
    });
  },

  /**
   * @method getRpcMethods
   * Get a list of the methods made available via RPC.
   * @returns {Array}
   */
  getRemoteMethods: function(){
    return this._methods;
  },

  /**
   * @method disconnect
   * Disconnect from the remote server.
   */
  disconnect: function(){
    if (!this.connected){
      this.fireWarning('Disconnect failed because the client is not connected!');
      return;
    }

    req.disconnect();
    this.onDisconnect();
  },

  /**
   * @event connecting
   * Fired when the client initiates a connection with the RPC server.
   */
  onConnecting: function(){
    _connected = false;
    _connecting = true;
    this.fireEvent('connecting');
  },

  /**
   * @event connect
   * Fired when the connection to the RPC server is established.
   */
  onConnect: function(){
    _connected = true;
    _connecting = false;

    var me = this;
    // Wrap the remote methods
    if (Object.keys(this._methods).length == 0){
      // Get the available methods from the RPC server.
      _client.methods(function(err,cmethods){
        if (Object.keys(cmethods).length == 0){
          me.fireWarning('The RPC service has no available methods.');
        } else {
          // Loop through the available methods and add them to the client
          Object.keys(cmethods).forEach(function(mthd){
            Object.defineProperty(me,mthd,{
              enumerable: true,
              writable: false,
              configurable: false,
              value: getMethodTree(cmethods[mthd],mthd)
            });
          });
        }
        /**
         * @event ready
         * Fired when the client is fully initialized and ready for I/O.
         */
        me.emit('ready');
      });
    }

    this.fireEvent('connect');
  },

  /**
   * @event disconnect
   * Fired when the connection to the RPC server is lost.
   */
  onDisconnect: function(){
    _connected = false;
    _connecting = false;
    this.fireEvent('disconnect');
  },

  /**
   * @event reconnect
   * Fired when the client tries to re-establish a connection to the server.
   */
  onReconnect: function(){
    _connected = false;
    _connecting = true;
    this.fireEvent('reconnect');
  }

});

// Create a module out of this.
module.exports = Class;