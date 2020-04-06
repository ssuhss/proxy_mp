var express = require('express');
var mongoose = require('mongoose');
var axios = require('axios');
var cron = require('node-cron');
var router = express.Router();
var Schema = mongoose.Schema;
mongoose.connect('mongodb://127.0.0.1/mercadopago', {useNewUrlParser: true, useUnifiedTopology: true});

var notificationSchema = new Schema({
  url: {type: String, required: true},
  params: JSON,
  body: String,
  method: String,
  date: {
    type: Date,
    default: Date.now
  },
  read: Boolean
}, {collection: 'notification'});

var Notification = mongoose.model('Notification', notificationSchema);

if (process.env.PROCESS_MODE == 'client') {
  cron.schedule('*/19 * * * *', () => {
    runCron();
    res.status(200).send({message: 'Cron success!'});
  });
}

function runCron() {
  axios.get(process.env.URL_SERVER + '/notification/read/0/limit/' + process.env.CRON_QTY).then(response => {
    var body = response.data;
    body.forEach(function (entry) {
      if (entry.params) {
        console.log(entry.params);
      }

      if (entry.method == 'POST') {
        axios.get(process.env.URL_LOCAL + entry.url, {
          params: entry.params
        });
      } else {
        axios.get(process.env.URL_LOCAL + entry.url, {
          params: entry.params
        });
      }
    });
  })
}

router.get('favicon.ico',  function (req, res, next) {
  res.status(200).send({message: 'Favicon'});
});

//REMOVE ALL NOTIFICATION
router.get('mongo/removeall/', function (req, res, next) {
	Notification.remove({});
  res.status(200).send({message: 'Cron success!'});
});

/* GET Notification BY ID */
router.get('notification/:id/', async function (req, res, next) {
  if (!req.params.id) {
    res.status(400).send({message: 'Id not Found!'});
  }
  const notificacoes = await Notification.find({_id: req.params.id});
  res.jsonp(notificacoes);
});


//GET NOTIFICATIONS WITH QTY
router.get('/notification/read/:read/limit/:limit/', async function (req, res, next) {
  var limit = 10;
  var readVar = req.params.read;
  if (req.params.limit) {
    limit = req.params.limit;
  }
  const notificacoes = await Notification.find({read: readVar}).sort([['date', 'ascending']]).limit(limit);
  res.jsonp(notificacoes);
});

//UPDATE to read
router.get('/notification/update/:id/read/', async function (req, res, next) {
  var id = req.params.id;
  Notification.findById(id, function (err, noti) {
    noti.read = true;
    noti.save();
  });
  res.status(200).send({message: 'Update success!'});
});

//CRON BY GET
router.get('/cron/', async function (req, res, next) {
  runCron();
  res.status(200).send({message: 'Cron success!'});
});



/* SAVE Notification */
router.all('/*/', function (req, res, next) {
  var params = req.params;
  var notificationRoute = params[0];

  if (notificationRoute === '/favicon.ico') {
    res.status(400).send({message: 'Favicon'});
  }
  var query = req.query;
  var method = req.method;
  var body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    var item = {
      url: notificationRoute,
      params: query,
      body: body,
      method: method,
      date: Date.now(),
      read: false
    };
    var data = new Notification(item);
    data.save();
  });
});

module.exports = router;
