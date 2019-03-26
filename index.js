const TelegramBot = require('node-telegram-bot-api');
const token = require('./token_config.json').token;
const axios = require('axios')
const Gpio = require('pigpio').Gpio;
const storage = require('node-persist');

var chatIds = []

await storage.init({
  dir: '/data',
});

const sendApplianceNotification = (chatIds, stop, device) => {
  chatIds.map((chatId) => {
    if(stop){
      // stoppage, display time
      bot.sendMessage(chatId, `${device} has finished cycle.`)
    } else {
      // startup
      bot.sendMessage(chatId, `${device} has started cycle. `)
    }
  })
}

const washer = new Gpio(2, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

const dryer = new Gpio(3, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

// Level must be stable for 65s before an alert event is emitted.
washer.glitchFilter(65000000);
dryer.glitchFilter(65000000);

washer.on('alert', (level, tick) => {
  let chatIds = await storage.getItem('chatIds');
  if (level === 1) {
    // washer on
    sendApplianceNotification(chatIds, false, 'Washer')
  } else {
    // washer off
    sendApplianceNotification(chatIds, true, 'Washer')
  }
});

dryer.on('alert', (level, tick) => {
  let chatIds = await storage.getItem('chatIds');
  if (level === 1) {
    // dryer on
    sendApplianceNotification(chatIds, false, 'Dryer')
  } else {
    // dryer off
    sendApplianceNotification(chatIds, true, 'Dryer')
  }
});

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/alive/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Yes, I\'m alive.')
});

bot.onText(/\/check/, (msg, match) => {
  const chatId = msg.chat.id;
});

bot.onText(/\/subscribe/, (msg, match) => {
  const chatId = msg.chat.id;
  let chatIds = []
  try {
    chatIds = await storage.getItem('chatIds');
    let uniq = await storage.setItem('chatIds', Array.from(new Set([...chatIds, chatId])));
    bot.sendMessage(chatId, "You have successfully subscribed to notifications!")
  }
  catch(e) {
    // no subscriptions
    await storage.setItem('chatIds', [chatId]);
    bot.sendMessage(chatId, "You have successfully subscribed to notifications!")
  }
});

bot.onText(/\/unsubscribe/, (msg, match) => {
  const chatId = msg.chat.id;
  await storage.removeItem('me');
  let chatIds = []
  try {
    chatIds = await storage.getItem('chatIds');
    var index = chatIds.indexOf(chatIds);
    if (index > -1) {
      let uniq = await storage.setItem('chatIds', chatIds.splice(index, 1));
      bot.sendMessage(chatId, "You have been successfully unsubscribed from notifications.")
    } else {
      bot.sendMessage(chatId, "You weren't subscribed for notifications. Nothing to do!")
    }
  }
  catch (e) {
    // no subscriptions, do nothing
    bot.sendMessage(chatId, "You weren't subscribed for notifications...nobody is. Nothing to do!")
  }
});

bot.onText(/\/help/, (msg, match) => {
  const chatId = msg.chat.id;
  console.log(msg.chat.id)
  var message = "This bot reports on washer/dryer status."
  bot.sendMessage(chatId, message)
});
