'use strict';

// Adding in Wit.ai support
npm install node-wit;
npm install body-parser express request;

// Config

const WIT_TOKEN = 'FILL5ZECKQD5JPEK2IVHL72WGRC2IDOT';
const FB_APP_SECRET = '184d4b8a4344339f00ce5d3e51b13925';
const FB_PAGE_TOKEN = 'EAARY8VLhHc8BAPyAI4T72mAdzuOujAQWaXFmGeUI05WbiwKBMuy07H7bVbR3hmy3tlHTslKqmep3mzsAh1VEyzZCav83d1WLbKa1nDpbeOrlHKQLtlUAEnn5aLW4QDozKZBsgJDFphztMJ531zQ5g4ZCJaTO6iAUDgxUe6TsQZDZD';

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');

// let Wit = null;
// let log = null;
// try {
//   // if running from repo
//   Wit = require('../').Wit;
//   log = require('../').log;
// } catch (e) {
//   Wit = require('node-wit').Wit;
//   log = require('node-wit').log;
// }

exports.handle = (event, context, callback) => {

  // Webserver parameter
  // const PORT = process.env.PORT || 8445;

  // Wit.ai parameters
  const WIT_TOKEN = process.env.WIT_TOKEN;

  // Messenger API parameters
  const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
  if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }
  const FB_APP_SECRET = process.env.FB_APP_SECRET;
  if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }

  let FB_VERIFY_TOKEN = null;
  crypto.randomBytes(8, (err, buff) => {
    if (err) throw err;
    FB_VERIFY_TOKEN = buff.toString('hex');
    console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
  });

  // ----------------------------------------------------------------------------
  // Messenger API specific code

  // See the Send API reference
  // https://developers.facebook.com/docs/messenger-platform/send-api-reference

  const fbMessage = (id, text) => {
    const body = JSON.stringify({
      recipient: { id },
      message: { text },
    });
    const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
    return fetch('https://graph.facebook.com/me/messages?' + qs, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body,
    })
    .then(rsp => rsp.json())
    .then(json => {
      if (json.error && json.error.message) {
        throw new Error(json.error.message);
      }
      return json;
    });
  };

  // ----------------------------------------------------------------------------
  // Wit.ai bot specific code

  // This will contain all user sessions.
  // Each session has an entry:
  // sessionId -> {fbid: facebookUserId, context: sessionState}
  const sessions = {};

  const findOrCreateSession = (fbid) => {
    let sessionId;
    // Let's see if we already have a session for the user fbid
    Object.keys(sessions).forEach(k => {
      if (sessions[k].fbid === fbid) {
        // Yep, got it!
        sessionId = k;
      }
    });
    if (!sessionId) {
      // No session found for user fbid, let's create a new one
      sessionId = new Date().toISOString();
      sessions[sessionId] = {fbid: fbid, context: {}};
    }
    return sessionId;
  };

  // Our bot actions
  const actions = {
    send({sessionId}, {text}) {
      // Our bot has something to say!
      // Let's retrieve the Facebook user whose session belongs to
      const recipientId = sessions[sessionId].fbid;
      if (recipientId) {
        // Yay, we found our recipient!
        // Let's forward our bot response to her.
        // We return a promise to let our bot know when we're done sending
        return fbMessage(recipientId, text)
        .then(() => null)
        .catch((err) => {
          console.error(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err.stack || err
          );
        });
      } else {
        console.error('Oops! Couldn\'t find user for session:', sessionId);
        // Giving the wheel back to our bot
        return Promise.resolve()
      }
    },
    // You should implement your custom actions here
    // See https://wit.ai/docs/quickstart
  };

  // Setting up our bot
  const wit = new Wit({
    accessToken: WIT_TOKEN,
    actions,
    logger: new log.Logger(log.INFO)
  });

  // Starting our webserver and putting it all together
  const app = express();
  app.use(({method, url}, rsp, next) => {
    rsp.on('finish', () => {
      console.log(`${rsp.statusCode} ${method} ${url}`);
    });
    next();
  });
  app.use(bodyParser.json({ verify: verifyRequestSignature }));

  // Webhook setup
  app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
      res.send(req.query['hub.challenge']);
    } else {
      res.sendStatus(400);
    }
  });

  // Message handler
  app.post('/webhook', (req, res) => {
    // Parse the Messenger payload
    // See the Webhook reference
    // https://developers.facebook.com/docs/messenger-platform/webhook-reference
    const data = req.body;

    if (data.object === 'page') {
      data.entry.forEach(entry => {
        entry.messaging.forEach(event => {
          if (event.message && !event.message.is_echo) {
            // Yay! We got a new message!
            // We retrieve the Facebook user ID of the sender
            const sender = event.sender.id;

            // We retrieve the user's current session, or create one if it doesn't exist
            // This is needed for our bot to figure out the conversation history
            const sessionId = findOrCreateSession(sender);

            // We retrieve the message content
            const {text, attachments} = event.message;

            if (attachments) {
              // We received an attachment
              // Let's reply with an automatic message
              fbMessage(sender, 'Sorry I can only process text messages for now.')
              .catch(console.error);
            } else if (text) {
              // We received a text message

              // Let's forward the message to the Wit.ai Bot Engine
              // This will run all actions until our bot has nothing left to do
              wit.runActions(
                sessionId, // the user's current session
                text, // the user's message
                sessions[sessionId].context // the user's current session state
              ).then((context) => {
                // Our bot did everything it has to do.
                // Now it's waiting for further messages to proceed.
                console.log('Waiting for next user messages');

                // Based on the session state, you might want to reset the session.
                // This depends heavily on the business logic of your bot.
                // Example:
                // if (context['done']) {
                //   delete sessions[sessionId];
                // }

                // Updating the user's current session state
                sessions[sessionId].context = context;
              })
              .catch((err) => {
                console.error('Oops! Got an error from Wit: ', err.stack || err);
              })
            }
          } else {
            console.log('received event', JSON.stringify(event));
          }
        });
      });
    }
    res.sendStatus(200);
  });

  /*
   * Verify that the callback came from Facebook. Using the App Secret from
   * the App Dashboard, we can verify the signature that is sent with each
   * callback in the x-hub-signature field, located in the header.
   *
   * https://developers.facebook.com/docs/graph-api/webhooks#setup
   *
   */
  function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
      // For testing, let's log an error. In production, you should throw an
      // error.
      console.error("Couldn't validate the signature.");
    } else {
      var elements = signature.split('=');
      var method = elements[0];
      var signatureHash = elements[1];

      var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                          .update(buf)
                          .digest('hex');

      if (signatureHash != expectedHash) {
        throw new Error("Couldn't validate the request signature.");
      }
    }
  }

  // app.listen(PORT);
  // console.log('Listening on :' + PORT + '...');

}




/////////////// OLD /////////////////

// var https = require('https');
// var PAGE_TOKEN = "EAARY8VLhHc8BAGicz52rikNieSNW8ZCgCm2I1jatZBk3pFTiImdQWsIpZAcT48ZA461DlQBfMrVhN3c4zVWKts0J9IDVBlqJhdTjXFX83YHguSEdzrViScU2HR9Q6SVLZBoTOMMeKpT4sZAaaFObkAtdapuXemSGci9CsooxWpvQZDZD";
// var VERIFY_TOKEN = "DFF3C13E3FFA8ED6C22DD25C1A526";


// exports.handle = (event, context, callback) => {
//   // process GET request
//   if(event.params && event.params.querystring){
//     var queryParams = event.params.querystring;
 
//     var rVerifyToken = queryParams['hub.verify_token']
 
//     if (rVerifyToken === VERIFY_TOKEN) {
//       var challenge = queryParams['hub.challenge']
//       callback(null, parseInt(challenge))
//     }else{
//       callback(null, 'Error, wrong validation token');
//     }
 
//   // process POST request
//   }else{
 
//     var messagingEvents = event.entry[0].messaging;
//     for (var i = 0; i < messagingEvents.length; i++) {
//       var messagingEvent = messagingEvents[i];
 
//       var sender = messagingEvent.sender.id;
//       if (messagingEvent.message && messagingEvent.message.text) {
//         var text = messagingEvent.message.text; 
//         console.log("Receive a message: " + text);
        
//         sendTextMessage(sender, "Text received, echo: "+ text.substring(0, 200));
 
//         callback(null, "Done")
//       }
//     }
 
//     callback(null, event);
//   }
// };

// function sendTextMessage(senderFbId, text) {
//   var json = {
//     recipient: {id: senderFbId},
//     message: {text: text},
//   };
//   var body = JSON.stringify(json);
//   var path = '/v2.6/me/messages?access_token=' + PAGE_TOKEN;
//   var options = {
//     host: "graph.facebook.com",
//     path: path,
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'}
//   };
//   var callback = function(response) {
//     var str = ''
//     response.on('data', function (chunk) {
//       str += chunk;
//     });
//     response.on('end', function () {
 
//     });
//   }
//   var req = https.request(options, callback);
//   req.on('error', function(e) {
//     console.log('problem with request: '+ e);
//   });
 
//   req.write(body);
//   req.end();
// }