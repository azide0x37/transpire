const TelegramBot = require('node-telegram-bot-api');
const token = require('./token_config.json').token;
const axios = require('axios')
const Gpio = require('pigpio').Gpio;
const storage = require('node-persist');
const debounce = require('debounce');

const telegramSend = async (chatIds, stop, device) => {
  chatIds.map((chatId) => {
    if(stop){
      bot.sendMessage(chatId, `${device} has finished cycle.`)
    } else {
      bot.sendMessage(chatId, `${device} has started cycle. `)
    }
  })
}

const sendApplianceNotification = debounce(telegramSend, 4000)

const washer = new Gpio(17, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

const dryer = new Gpio(4, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});

// Level must be stable for 65s before an alert event is emitted.
washer.glitchFilter(3000);
dryer.glitchFilter(3000);

washer.on('alert', async (level, tick) => {
  let startTick
  level === 1 ? sendApplianceNotification(await storage.getItem('chatIds'), true, 'Washer')
    : sendApplianceNotification(await storage.getItem('chatIds'), false, 'Washer')
})

dryer.on('alert', async (level, tick) => {
  let startTick
  level === 1 ? sendApplianceNotification(await storage.getItem('chatIds'), true, 'Dryer')
    : sendApplianceNotification(await storage.getItem('chatIds'), false, 'Dryer')
})

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
    var index = chatIds.indexOf(chatId);
    if (index > -1) {
      bot.sendMessage(chatId, "You are already subscribed to notifications.")
    } else {
      await storage.updateItem('chatIds', Array.from(new Set([...chatIds, chatId])));
      bot.sendMessage(chatId, "You have successfully subscribed to notifications!")      
    }
  }
  catch(e) {
    console.log(e);
    console.log("sub failed");
  }
});
bot.onText(/\/unsubscribe/, async (msg, match) => {
  const chatId = msg.chat.id;
  let chatIds = []
  try {
    chatIds = await storage.getItem('chatIds');
    var index = chatIds.indexOf(chatId);
    if (index > -1) {
      chatIds.splice(index, 1)
      await storage.updateItem('chatIds', chatIds);
      bot.sendMessage(chatId, "You have been successfully unsubscribed from notifications.")
    } else {
      bot.sendMessage(chatId, "You weren't subscribed for notifications. Nothing to do!")
    }
  }
  catch (e) {
    // no subscriptions, do nothing
    console.log(e);
    bot.sendMessage(chatId, "You weren't subscribed for notifications...nobody is. Nothing to do!")
  }
});
