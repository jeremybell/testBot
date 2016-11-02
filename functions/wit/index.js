'use strict';
var VERIFY_TOKEN = "DFF3C13E3FFA8ED6C22DD25C1A526";
exports.handler = (event, context, callback) => {
 
  // process GET request
  if(event.params && event.params.querystring){
    var queryParams = event.params.querystring;
 
    var rVerifyToken = queryParams['hub.verify_token']
 
    if (rVerifyToken === VERIFY_TOKEN) {
      var challenge = queryParams['hub.challenge']
      callback(null, parseInt(challenge))
    }else{
      callback(null, 'Error, wrong validation token');
    }
  }
}