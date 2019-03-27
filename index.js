const TelegramBot = require('node-telegram-bot-api');
const token = require('./token_config.json').token;
const axios = require('axios')
const Gpio = require('pigpio').Gpio;
const storage = require('node-persist');

const sendApplianceNotification = async (chatIds, stop, device) => {
  chatIds.map((chatId) => {
    if(stop){
      bot.sendMessage(chatId, `${device} has finished cycle.`)
    } else {
      bot.sendMessage(chatId, `${device} has started cycle. `)
    }
  })
}

const washer = new Gpio(4, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

const dryer = new Gpio(17, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

// Level must be stable for 65s before an alert event is emitted.
washer.glitchFilter(10000);
dryer.glitchFilter(10000);

washer.on('alert', async (level, tick) => sendApplianceNotification(await storage.getItem('chatIds'), level === 1, 'Washer'))
dryer.on('alert', async (level, tick) => sendApplianceNotification(await storage.getItem('chatIds'), level === 1, 'Dryer'))

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/alive/, (msg, match) => bot.sendMessage(msg.chat.id, 'Yes, I\'m alive.'))
bot.onText(/\/init/, async (msg, match) => { /*only allow once*/await storage.init({ dir: 'data' }); bot.sendMessage(msg.chat.id, 'Bot initialized.')})
bot.onText(/\/help/, (msg, match) => bot.sendMessage(msg.chat.id, "This bot reports on washer/dryer status."))
bot.onText(/\/subscribe/, async (msg, match) => {
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
bot.onText(/\/unsubscribe/, async (msg, match) => {
  const chatId = msg.chat.id;
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
