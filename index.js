/*jshint esnext: true */

//We're using koa, so lets require it, (duh).
const koa = require('koa');

// Middleware and helpers
const serve = require('koa-static');
const parse = require('co-body');
const router = require('koa-router');
const http = require('http');
const r = require('rethinkdb');


// Load config for RethinkDB and koa
const config = require(__dirname + "/config.js");

//and initialize it with
const app = new koa()

// Static content
app.use(serve(__dirname+'/public'));

// Create a RethinkDB connection
app.use(createConnection);

//Initialize router
var api = router();

//Define routes
api.get('/events', events);
api.get('/api/event/get', getEvents);
api.put('/api/event/new', createEvent);
api.post('/api/event/update', updateEvent);
api.post('/api/event/delete', delEvent);

//Register routes and allowed methods
app
  .use(api.routes())
  .use(api.allowedMethods());

// Close the RethinkDB connection
app.use(closeConnection);

var server = http.createServer(app.callback());
var io = require('socket.io')(server);

io.on('connection', function (socket) {
  	console.log("Client connected");
});

/*
 * Create a RethinkDB connection, and save it in req._rdbConn
 */
function* createConnection(next) {
    try{
        var conn = yield r.connect(config.rethinkdb);
        this._rdbConn = conn;
    }
    catch(err) {
        this.status = 500;
        this.body = err.message || http.STATUS_CODES[this.status];
    }
    yield next;
}

function* events(next) {
	console.log("events");
    try{
        var cursor = yield r.table('events').orderBy({index: "createdAt"}).run(this._rdbConn);
        var result = yield cursor.toArray();
        this.body = JSON.stringify(result);
    }
    catch(e) {
        this.status = 500;
        this.body = e.message || http.STATUS_CODES[this.status];
    }
    yield next;
}


// Retrieve all events
function* getEvents(next) {
    try{
        var cursor = yield r.table('events').orderBy({index: "createdAt"}).run(this._rdbConn);
        var result = yield cursor.toArray();
        this.body = JSON.stringify(result);
    }
    catch(e) {
        this.status = 500;
        this.body = e.message || http.STATUS_CODES[this.status];
    }
    yield next;
}

// Create a new event
function* createEvent(next) {
    try{
        var event = yield parse(this);
        event.createdAt = r.now(); // Set the field `createdAt` to the current time
        var result = yield r.table('events').insert(event, {returnChanges: true}).run(this._rdbConn);

        event = result.new_val; // event now contains the previous event + a field `id` and `createdAt`
        this.body = JSON.stringify(event);
    }
    catch(e) {
        this.status = 500;
        this.body = e.message || http.STATUS_CODES[this.status];
    }
    yield next;
}

// Update an event
function* updateEvent(next) {
    try{
        var event = yield parse(this);
        delete event._saving;
        if ((event === null) || (event.id === null)) {
            throw new Error("The event must have a field `id`.");
        }

        var result = yield r.table('events').get(event.id).update(event, {returnChanges: true}).run(this._rdbConn);
        this.body = JSON.stringify(result.new_val);
    }
    catch(e) {
        this.status = 500;
        this.body = e.message || http.STATUS_CODES[this.status];
    }
    yield next;
}

// Delete an event
function* delEvent(next) {
    try{
        var event = yield parse(this);
        if ((event === null) || (event.id === null)) {
            throw new Error("The event must have a field `id`.");
        }
        var result = yield r.table('events').get(event.id).delete().run(this._rdbConn);
        this.body = "";
    }
    catch(e) {
        this.status = 500;
        this.body = e.message || http.STATUS_CODES[this.status];
    }
    yield next;
}

/*
 * Close the RethinkDB connection
 */
function* closeConnection(next) {
    this._rdbConn.close();
    //yield next;
}

r.connect(config.rethinkdb, function(err, conn) {
    if (err) {
        console.log("Could not open a connection to initialize the database");
        console.log(err.message);
        process.exit(1);
    }

    r.table('events').indexWait('createdAt').run(conn).then(function(err, result) {
        console.log("Table and index are available, starting koa...");
        startKoa();
    }).error(function(err) {
        // The database/table/index was not available, create them
        r.dbCreate(config.rethinkdb.db).run(conn).finally(function() {
            return r.tableCreate('events').run(conn);
        }).finally(function() {
            r.table('events').indexCreate('createdAt').run(conn);
        }).finally(function(result) {
            r.table('events').indexWait('createdAt').run(conn);
        }).then(function(result) {
            console.log("Table and index are available, starting koa...");
            startKoa();
            conn.close();
        }).error(function(err) {
            if (err) {
                console.log("Could not wait for the completion of the index `events`");
                console.log(err);
                process.exit(1);
            }
            console.log("Table and index are available, starting koa...");
            startKoa();
            conn.close();
        });
    });
});

function startKoa() {
    server.listen(config.koa.port);
    console.log('Listening on port '+config.koa.port);
}

r.connect({db: "rethinkdb_ex"}).then(function(c) {
  r.table("events").changes().run(c)
    .then(function(cursor) {
      cursor.each(function(err, item) {
      	console.log("New event");
        io.sockets.emit("event", item);
      });
    });
});