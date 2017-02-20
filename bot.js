var TelegramBot = require('node-telegram-bot-api');

token = process.env.TOKEN;
port = process.env.PORT || '8080';
admin = process.env.ADMIN;
activeChats = {}; // {repo : [chat1, chat2]}

if (!token){
  console.log('Set token for TelegramBot');
  process.exit(1);
}

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

// HTTP server for handling gitlab webhooks
const http = require('http');
const jsonBody = require("body/json")

gitlabHeader = 'X-Gitlab-Event';
gitlabHeaderRaw = gitlabHeader.toLowerCase();
tagPushHook = 'Tag Push Hook';
pushHook = 'Push Hook';

http.createServer(function handleRequest(req, res) {
  function processWebHook(err, body){
    repoName = body.project.name;
    if (repoName in activeChats){
      body.commits.map((commit) => {
        activeChats[repoName].map((chat) => {
          bot.sendMessage(chat, 
            `New commit to '${repoName} by ${commit.author.name}'
            >${commit.message}
            ${commit.url}
            `
          );
        });
      });
    }
    res.end('ok');
  }
  // check for gitlab headers
  header = gitlabHeaderRaw in req.headers ? req.headers[gitlabHeaderRaw] : '';
  if (header === pushHook) jsonBody(req, res, processWebHook);
  res.end('error');
}).listen(port);
