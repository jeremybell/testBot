import express from 'express'
import bodyParser from 'body-parser'
import Bot from 'messenger-bot'

//import { handleMessage } from './bot.js'
//import config from './../config.js'


/* Define new bot */

let bot = new Bot({
  token: 'EAARY8VLhHc8BAIZCjTtrfoTIXzdnFf7qUaVmhTK37uYDeedkOATNWWo7fPgLrIyGA6BtsTqhLtNOuiYZAtNqsSivYtVXxKfXuWZBUiWxNv44NvHGoukB9QG7L8Uafcs86bYoYRFwUaDhG6arKiw14hMQnZA9UGF6T0h7ZAVEVIQZDZD',
  verify: '3F4CEB59F7113A498491532EFFE2D',
  app_secret: '184d4b8a4344339f00ce5d3e51b13925'
})

bot.on('error', (err) => {
  console.log(err.message)
})

bot.on('message', (payload, reply) => {
  let text = payload.message.text

  /* Get FB Profile info from sender */

  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

      text = "Hi " + profile.first_name + ". You Said: " + text

    reply({ text }, (err) => {
      if (err) throw err
      // console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
    })
  })
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
