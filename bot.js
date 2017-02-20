var TelegramBot = require('node-telegram-bot-api');

token = process.env.TOKEN;
port = process.env.PORT || '8080';
admin = process.env.ADMIN;
activeChats = {}; // {repo : [chat1, chat2]}

const bot = new TelegramBot(token, { polling: true });

function adminCheck(msg){
  if (msg.from.username === admin) {
    return true;
  } else {
    bot.sendMessage(msg.chat.id, `You have no rights here. Sorry`);
    return false;
  }
}

bot.onText(/\/gitlab_watch (.+)/, (msg, match) => {
  if (! adminCheck(msg)) return false; 

  chatId = msg.chat.id;
  repo = match[1];
  if (repo in activeChats) { // TODO check for uniq
    activeChats[repo].push(chatId);
  } else {
    activeChats[repo] = [chatId];
  }
  bot.sendMessage(chatId, `You now watching repo: ${repo}`);
});

bot.onText(/\/gitlab_forget (.+)/, (msg, match) => {
  if (! adminCheck(msg)) return false; 
  chatId = msg.chat.id;
  repo = match[1];
  if (repo in activeChats) {
    activeChats[repo] = activeChats[repo].reduce((prev,cur) => {
      if (cur !== chatId) return prev.push(cur);
    },[]);
  }
});

bot.onText(/\/gitlab_list/, (msg, match) => {
  chatId = msg.chat.id;
  Object.keys(activeChats).map(
    (repo) => activeChats[repo].map(
      (chat) => {
        if (chat === chatId) bot.sendMessage(chatId, `You are subscribed for '${repo}'`);
      }
  ));
});

// EXPRESS 
const express = require('express');
const bodyParser = require('body-parser');

gitlabHeader = 'X-Gitlab-Event';
// 'Tag Push Hook';
pushHook = 'Push Hook';

const app = express();
app.use(bodyParser.json());
app.all('*', (req, res) => {
  header = req.get(gitlabHeader);
  if (header === pushHook) {
    Object.keys(activeChats).map(
      (repo) => activeChats[repo].map(
        (chat) => bot.sendMessage(chat,`Hook ${repo}`))
    );
  }
  res.status(200).end('Ok');
});

app.listen(process.env.PORT || port);
