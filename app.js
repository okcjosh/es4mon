var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var mailer = require('nodemailer');
var mysql = require('mysql');
var fs = require('fs');
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

const realServer = 'es4.io';
const devServer = '';
const localServer = '192.168.0.17';

var transport = mailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'es4mailer@gmail.com',
        pass: 'es4es4es4es4'
    }
});

var connection = mysql.createConnection({
    host     : 'es4.clmk2ccz7ewv.us-west-2.rds.amazonaws.com',
    user     : 'es4admin',
    password : 'es4admin',
    database : 'es4_sheyi'
});
connection.connect();
console.log('connected: ' + connection);
var emailTemplate = '';
fs.readFile('emailTemplateJobNotification.html', function(err, data) {
    if(err)
        console.log("Error reading file: " + err);
    else
    {
        //console.log("File read");
        emailTemplate = data.toString();
        //console.log('template: ' + emailTemplate);
    }
})


//console.log(schedule);
var rule = new schedule.RecurrenceRule();
//console.log('rule: ' + rule);
rule.second = 9;

var job = schedule.scheduleJob(rule, function () {
    console.log('Job fired');
    checkInvitations();
    checkJobs();
    checkReminders();
});
console.log('Schedule started')

module.exports = app;

function checkInvitations() {
    var leos = connection.query("select ji.*, l.name, l.phone, l.email from JobInvitation ji inner join Leos l on ji.leo_id = l._id where job_invitation_status_id = 1", function (err, rows, fields) {
        if (err)
            console.log(err);
        else
        {
            console.log('got rows: ' + rows.length);
            for(var i = 0; i < rows.length; i++)
            {
                var row = rows[i];
                var msg = getMessage(row);
                sendText(row, msg);
                console.log('Text sent to ' + row.phone);
                sendEmail(row, msg);
                console.log('Email sent to ' + row.email);
                var sql = "update JobInvitation set job_invitation_status_id = 2 where _id = " + rows[i]._id;
                console.log('sql: ' + sql);
                connection.query(sql, function(err, rows, fields) {
                    if(err)
                        console.log(err);
                    else
                        console.log('Updated invitation record');
                })
            }
        }
    });
}

function checkJobs() {

}

function checkReminders() {

}

function getMessage(job_invitation_row) {
    var msg = 'You have been selected to work a security detail for DPD. Please visit '
        + 'http://' + realServer + ':3000/invitation?event_id=' + job_invitation_row.party_id + ' to accept this job.';
    return msg;
}

function sendText (job_invitation_row, msg) {
    console.log('Name ' + job_invitation_row.name);
    client.sms.messages.create({
        to: job_invitation_row.phone,
        from: '+12146438974',
        body: msg
    }, function (err, sms) {
        if(err)
            console.log(err);
        else
            console.log('Text sent: ' + sms.sid);
    });
}

function sendEmail(job_invitation_row, msg) {
    emailTemplate = emailTemplate.replace("?event_id=", "?event_id=" + job_invitation_row.party_id);
    var mailoptions = {
        from:'es4mailer@gmail.com',
        to: job_invitation_row.email,
        subject: 'ES4 Job Notification',
        //text: msg
        html: emailTemplate
    };
    transport.sendMail(mailoptions, function (err, info) {
        if(err) {
            console.log(err);
        } else {
            console.log('mail sent ' + info.response);
        }
    });
}