var axon = require('axon'),
    rpc = require('ngn-axon-rpc'),
    rep = axon.socket('rep'),
    _server = null;

/**
 * @class NGN.rpc.Server
 * The RPC server is a special TCP socket server that exposes
 * API functions to other processes. This class encapsulates application
 * logic in a manner that can be reused by both local and remote NGN processes.
 * For example, a REST interface and an XMPP chat interface can both use the same
 * underlying logic by making remote procedure calls to the same server.
 *
 * **Example: Hard-coded Object**
 *
 *      var controller = new NGN.rpc.Server({
 *        port: 4000,
 *        expose: {
 *          sayHello: function(name){
 *            return "Hello, "+name;
 *          },
 *          sayGoodbye: function(name){
 *            return "Goodbye "+name;
 *          }
 *        }
 *      });
 *
 * **Example: Module**
 *
 *      var controller = new NGN.rpc.Server({
 *        port: 4000,
 *        module: require('./path/to/module.js')
 *      });
 *
 * @docauthor Corey Butler
 * @extends NGN.core.Server
 */
var Class = NGN.core.Server.extend({

  /**
   * @constructor
   * Create a HTTP/S server.
   */
  constructor: function(config){

    var me = this;

    config = config || {};
    config.type = 'TCP';
    config.purpose = 'RPC';

    Class.super.constructor.call( this, config );

    /**
     * @cfg port (required)
     * @inheritdoc
     */

    Object.defineProperties(this,{
      /**
       * @cfg {Object} module
       * This can be a filepath or an Object. It contains the functions
       * that make up the API.
       *
       * **Example: Hard-coded Object**
       *
       *     var controller = new NGN.rpc.Server({
       *       port: 4000,
       *       module: {
       *         sayHello: function(name){
       *           return "Hello, "+name;
       *         },
       *         sayGoodbye: function(name){
       *           return "Goodbye "+name;
       *         }
       *       }
       *     });
       *
       * **Example: Module**
       *
       *     var controller = new NGN.rpc.Server({
       *       port: 4000,
       *       module: require('./path/to/module.js')
       *     });
       *
       */
      module: {
        enumerable: true,
        writable: true,
        value: config.module
      },

      /**
       * @property {Object} server
       * The RPC server.
       * @private
       * @readonly
       */
      server: {
        enumerable: false,
        get: function(){
          return _server;
        }
      }
    });

    var me   = this;

    this.on('start',function(){
      me.onReady();
    });

    if (this.autoStart)
      this.start();
  },

  /**
   * @method expose
   * Expose a custom module (require) or an object, just like #module.
   * @param {Object} module (required)
   */
  expose: function(module){
    if (!this.running){
      this.fireWarning('Cannot expose module until the server is started.');
    }
    _server.expose(module);
  },

  /**
   * @method start
   * Start listening for requests.
   */
  start: function(){
    if (!this.running) {
      try {
        var me = this;
        this.starting = true;
        rep.bind(this.port,function(){
          _server = new rpc.Server(rep);
          _server.expose(me.module);
          me.onStart();
        });
      } catch (e) {
        this.starting = false;
        this.onError(e);
      }
    } else {
      this.fireWarning('Server already started. Cannot start twice. Make sure autoStart=true and start() are not being executed sequentially.');
    }
  },

  /**
   * @method stop
   * Stop the server.
   */
  stop: function(){
    if (this.running) {
      _server.close();
      this.onStop();
    }
  }

});



// Create a module out of this.
module.exports = Class;