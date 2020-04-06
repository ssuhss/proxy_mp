const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.connect('mongodb://127.0.0.1/mercadopago', {useNewUrlParser: true, useUnifiedTopology: true});  

const notificationSchema = new Schema({  
 url: {type: String, required: true},  
 params: JSON,  
 body: String,
 method: String,
 date:  { 
   type: Date, 
   default: Date.now 
 },
 read: Boolean 
}, {collection: 'notification'});

module.exports = mongoose.model('Notification', notificationSchema);