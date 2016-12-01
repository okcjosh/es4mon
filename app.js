var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var mysql = require('mysql');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
var accountSid = 'AC9ce0d28ee69cd6ff89fdc1b8d0139099';
var authToken = '4890e088921ee4039f79b22d44d0ebb1';
var client = require('twilio')(accountSid, authToken);

var connection = mysql.createConnection({
    host     : 'es4.clmk2ccz7ewv.us-west-2.rds.amazonaws.com',
    user     : 'es4admin',
    password : 'es4admin',
    database : 'es4'
});
connection.connect();
console.log('connected: ' + connection);
//console.log(schedule);
var rule = new schedule.RecurrenceRule();
rule.second = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
// var rule = new schedule.RecurrenceRule();
console.log('rule: ' + rule);
// rule.second = 1;
console.log('About to schedule');
var job = schedule.scheduleJob(rule, function () {
    console.log('Job fired');
    var leos = connection.query("select * from job_invitation ji inner join leo l on ji.leo_id = l.leo_id where job_invitation_status_id = 1", function (err, rows, fields) {
        if (err)
            console.log(err);
        else
        {
            console.log('got rows: ' + rows.length);
            for(var i = 0; i < rows.length; i++)
            {
                console.log('Name ' + rows[i].name);
                client.sms.messages.create({
                    to: rows[i].phone,
                    from: '+12146438974',
                    body: 'This message was generated because you have been selected to work a security detail for DPD. Please visit '
                    + 'http://es4.io:3000/hello to accept this job.'
                }, function (err, sms) {
                    console.log(sms.sid);
                });
                connection.query("update job_invitation set job_invitation_status_id = 2 where job_invitation_id = " + rows[i].job_invitation_id, function(err, rows, fields) {
                    if(err)
                        console.log(err);
                    else
                        console.log('Updated invitation record');
                })
            }
        }
    });
});
console.log('Schedule started')

module.exports = app;
