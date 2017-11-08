var createStore = require('pure-flux').createStore;
var dispatch = require('pure-flux').dispatch;
var pathToRegexp = require('./pathToRegexp');
let pathRegexps = {};
let locationToken = require('./location').dispatchToken;
let locationStore = require('./location');

// Return the first matching route.
function match(routes=[], path) {
  for (var i = 0; i < routes.length; i++) {
    var re = pathRegexps[routes[i].path] || pathToRegexp(routes[i].path);
    pathRegexps[routes[i].path] = re;

    if (re && re.test(path)) {
      return { re, route: routes[i] };
    }
  }

  return false;
}


// Create a store with options:
//
// - routes - [{ path: "/buckets/:id", action: Promise }]
//   A list of routes that specify a URL path and an action that must return a promise to the page content.
module.exports = createStore( 'router', (state={ content: null }, action, waitFor) => {

  // routes depends on location store being updated first!
  waitFor([locationToken]);

  var {routes} = state;
  var path = locationStore.getState().path;

  switch (action.type) {
  case 'loadRoutes':
    return Object.assign({}, state, { routes: action.data });
  case 'loadContent':
    return Object.assign({}, state, { content: action.content, params: action.params, route: action.route });
  case 'openPath':
  case 'redirectPath':
    var found = match( routes, path );
    var {re, route} = found;
    var paramNames = re.exec(route.path).slice(1);
    var args = re.exec(path).slice(1);

    // zip into object { key: value }
    var params = paramNames.length === args.length ?
        paramNames.reduce( (acc, key, i) => { acc[key.substring(1)] = args[i]; return acc; }, {}) :
        {};

    // run the action method defined by the router
    if (found && route && route.load) {
      route.load.apply(this, params)
        .then( (action) => dispatch( {
          type: action.type,
          content: action.data,
          params,
          args,
          route
        } ) );
    }

  default:
    return state;
  }
});
