let express = require('express');
let mongoose = require('mongoose');
let axios = require('axios');
let cron = require('node-cron');
let router = express.Router();
let Schema = mongoose.Schema;
require('dotenv').config();

/**
 * Run Cron by Schedule
 */
if (process.env.PROCESS_MODE === 'client') {
    cron.schedule(process.env.CRON_SCHEDULE, () => {
        runCron();
    });
} else {
    mongoose.connect('mongodb://127.0.0.1/mercadopago', {useNewUrlParser: true, useUnifiedTopology: true});

    let notificationSchema = new Schema({
        url: String,
        params:  String,
        body: String,
        method: String,
        date: {
            type: Date,
            default: Date.now
        },
        read: Boolean
    }, {collection: 'notification'});

    var Notification = mongoose.model('Notification', notificationSchema);
}

/**
 * Run Cron
 */
function runCron() {
    axios.get(process.env.URL_SERVER + '/notification/read/0/limit/' + process.env.CRON_QTY).then(response => {

        let body = response.data;
        body.forEach(function (entry) {
            if (entry.method === 'POST') {
                axios.post(process.env.URL_LOCAL + entry.url, {
                    params: JSON.parse(entry.params)
                }).then(function () {
                    axios.get(process.env.URL_SERVER + '/notification/update/' + entry._id + '/read');
                }).catch(function (error) {
                    //console.log(error);
                });

            } else {
                axios.get(process.env.URL_LOCAL + entry.url, {
                    params: JSON.parse(entry.params)
                }).then(function () {
                    axios.get(process.env.URL_SERVER + '/notification/update/' + entry._id + '/read');
                }).catch(function (error) {
                    //console.log(error);
                });
            }
        });
    })
}

/**
 * Insert Item
 */
function insertItem(req, route) {
    let params = req.params;
    let notificationRoute = route + params[0];
    let query = req.query;
    let method = req.method;
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        let item = {
            url: notificationRoute,
            params: JSON.stringify(query),
            body: body,
            method: method,
            date: Date.now(),
            read: false
        };
        let data = new Notification(item);
        data.save();
    });
}

/**
 * Block Favicon.ico
 */
router.get('/favicon.ico', function (req, res, next) {
    res.status(200).send({message: 'Favicon'});
});
router.post('/favicon.ico', function (req, res, next) {
    res.status(200).send({message: 'Favicon'});
});

/**
 * Delete all Notification
 */
router.get('/notification/removeall', function (req, res, next) {
    Notification.deleteMany({}, function (err, result) {
        if (err) {
            res.send(err);
        } else {
            res.status(200).send({message: 'ALL REMOVED!'});
        }
    });
});


/**
 * Update Notification by ID
 */
router.get('/notification/update/:id/read', async function (req, res, next) {
    var id = req.params.id;
    Notification.findById(id, function (err, noti) {
        noti.read = true;
        noti.save();
    });
    res.status(200).send({message: 'Update success!'});
});


/**
 * Get Notification by Read & Limit
 */
router.get('/notification/read/:read/limit/:limit', async function (req, res, next) {
    var limit = 10;
    var readVar = req.params.read;
    if (req.params.limit) {
        limit = req.params.limit;
    }
    const notificacoes = await Notification.find({read: readVar}).sort([['date', 'ascending']]).limit(limit);
    res.jsonp(notificacoes);
});

/**
 * Get Notification by ID
 */
router.get('notification/:id/', async function (req, res, next) {
    if (!req.params.id) {
        res.status(400).send({message: 'Id not Found!'});
    }
    const notificacoes = await Notification.find({_id: req.params.id});
    res.jsonp(notificacoes);
});

/**
 * Run Cron
 */
router.get('/cron/', async function (req, res, next) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    runCron();
    res.status(200).send({message: 'Cron success!'});
});


/**
 * Save Notification
 */
router.post('/mercadopago/*/', async function (req, res) {
    insertItem(req, '/mercadopago/');
    res.status(200).send({message: 'Insert OK'});
});

/**
 * Save All request
 */
router.all('/*/', async function (req, res) {
    insertItem(req, '/');
    res.status(200).send({message: 'Insert OK'});
});

module.exports = router;
