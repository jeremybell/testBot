import express from 'express'
import bodyParser from 'body-parser'
import Bot from 'messenger-bot'

//import { handleMessage } from './bot.js'
//import config from './../config.js'


/* TEST!!!  Define new bot */

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

  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

    reply({ text }, (err) => {
      if (err) throw err

      console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
    })
  })
})


/*
* Creation of the server
*/

const app = express()
app.set('port', process.env.PORT || 5000)
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())

/*
* views is directory for all template files
*/

app.set('views', __dirname + './../views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index')
});

/*
* connect your webhook
*/

app.get('/webhook', (req, res) => {
  return bot._verify(req, res)
})

/*
* Take care of the messages
*/

app.post('/webhook', (req, res) => {
  bot._handleMessage(req.body)
    res.sendStatus(200)
})

app.listen(app.get('port'), () => {
  console.log('Our bot is running on port', app.get('port'))
})
