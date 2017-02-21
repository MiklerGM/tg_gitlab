var fs = require('fs');
var path = require('path');

var TelegramBot = require('node-telegram-bot-api');

token = process.env.TOKEN;
port = process.env.PORT || '8080';
admin = process.env.ADMIN;
subscribers = {}; // {project : [chat1, chat2]}
subsConfig = path.join(__dirname,'/configs/subscribers.json');

try {
  subscribers = JSON.parse(fs.readFileSync(subsConfig));
} catch (err) {
  console.info('ERROR: Error parsing your subscribers.json');
}

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

function serialize(){
  fs.writeFile(subsConfig, JSON.stringify(subscribers),
    (err) => {if (err) console.log(err)});
}

bot.onText(/\/gitlab_watch (.+)/, (msg, match) => {
  if (! adminCheck(msg)) return false; 

  chatId = msg.chat.id;
  project = match[1];
  if (project in subscribers) { // TODO check for uniq
    subscribers[project].push(chatId);
  } else {
    subscribers[project] = [chatId];
  }
  serialize();
  bot.sendMessage(chatId, `You now watching project: ${project}`);
});

bot.onText(/\/gitlab_forget (.+)/, (msg, match) => {
  if (! adminCheck(msg)) return false; 
  chatId = msg.chat.id;
  project = match[1];
  if (project in subscribers) {
    subscribers[project] = subscribers[project].reduce((prev,cur) => {
      if (cur !== chatId) return prev.push(cur);
    },[]);
    serialize();
  }
});

bot.onText(/\/gitlab_list/, (msg, match) => {
  chatId = msg.chat.id;
  Object.keys(subscribers).map(
    (project) => subscribers[project].map(
      (chat) => {
        if (chat === chatId) bot.sendMessage(chatId, `You are subscribed for '${project}'`);
      }
  ));
});

// HTTP server for handling gitlab webhooks
const http = require('http');
const jsonBody = require("body/json")

gitlabHeader = 'X-Gitlab-Event';
gitlabHeaderRaw = gitlabHeader.toLowerCase();
tagPushHook = 'Tag Push Hook';
pushHook = 'System Hook';
objectKind = 'object_kind';

http.createServer(function handleRequest(req, res) {
  function pushWebHook(body) {
    projectName = body.project.name;
    console.log('Processing a webhook for repo: ', projectName);
    if (projectName in subscribers){
      body.commits.map((commit) => {
        subscribers[projectName].map((chat) => {
          bot.sendMessage(chat, 
            `New commit to '${projectName} by ${commit.author.name}'
            >${commit.message}
            ${commit.url}
            `
          );
        });
      });
    }
  }
  function processWebHook(err, body){
    console.log(body);
    if (objectKind in body && body[objectKind] === 'push') pushWebHook(body);
    res.end('ok');
  }
  // check for gitlab headers
  header = gitlabHeaderRaw in req.headers ? req.headers[gitlabHeaderRaw] : '';
  console.log('Get a Request with headers: ', JSON.stringify(req.headers));
  if (header === pushHook) jsonBody(req, res, processWebHook);
  res.end('error');
}).listen(port);
