'use strict'

import express from 'express'
import bodyParser from 'body-parser'
import config from './config.js'
import Bot from 'messenger-bot'
import { Client } from 'recastai'
//import { handleMessage } from './bot.js' // old bot code

/* Define new Messenger bot */

const bot = new Bot({
  token: config.pageAccessToken,
  verify: config.validationToken,
  app_secret: config.appSecret
})

/* Define new Recast client */
const recastClient = new Client(config.recastToken, config.language)

bot.on('error', (err) => {
  console.log(err.message)
})

bot.on('message', (payload, reply) => {
   // let text = payload.message.text

  /* Get FB Profile info from sender */
  // bot.getProfile(payload.sender.id, (err, profile) => {
  //   if (err) throw err
  //
  //   text = "Hi " + profile.first_name + "!!!!! You Said: " + text
  //
  // })

  const senderID = payload.sender.id
  const messageText = payload.message.text
  const messageAttachments = payload.message.attachments


  recastClient.textConverse(messageText, { conversationToken: senderID }).then((res) => {
    const recastReply = res.reply()               /* To get the first reply of your bot. */
    const recastReplies = res.replies             /* An array of all your replies */
    const recastAction = res.action               /* Get the object action. You can use 'action.done' to trigger a specification action when it's at true. */

    if (!recastReply) {
       reply({ text: "hmm. I seem to be having a brain fart." })
    } else {

      //console.log(replies);

      if (recastAction && recastAction.done === true) {
        console.log('action is done')
        // Use external services: use res.memory('notion') if you got a notion from this action
      }

      let promise = Promise.resolve()

      recastReplies.forEach(rep => {
        promise = promise.then(() => {
          reply({ text: rep }) // send reply back to FB
        })
      })

      promise.then(() => {
        console.log('ok')
      }).catch(err => { console.log(err) })
    }
  }).catch(err => { console.log(err) })

})


/* Creation of the server */

const app = express()
app.set('port', process.env.PORT || 5000)
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())

/* views is directory for all template files */

app.set('views', __dirname + './../views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index')
});

/* Handle communication to & from FB */

app.get('/webhook', (req, res) => {
  return bot._verify(req, res) // Verify FB app, as needed.
})

app.post('/webhook', (req, res) => {
  bot._handleMessage(req.body) // Process incoming message from FB
  res.sendStatus(200) // Immeidately send FB a thumbs up
})

app.listen(app.get('port'), () => {
  console.log('Our bot is running on port', app.get('port'))
})
