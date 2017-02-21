# tg_gitlab
## NodeJS Telegram bot for GitLab 

### Current status

* Push Hook: supported

### Configure GitLab

To enable `PUSH HOOK` you need configure web hooks for *each project*
[Official documentation](https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/user/project/integrations/webhooks.md)

### Working with bot
* Obtain `TOKEN` from @BotFather in Telegram
* Configure GitLab
* Install bot

### Available commands

`* /gitlab_watch <projectName>` 
  Sending messages about updates for <projectName> to this chat

`* /gitlab_forget <projectName>`
  Do not send messages about <projectName> to this chat

`* /gitlab_list`
  Show list of subscriptions for updates


### Installation
```bash
docker pull morlov/tg_gitlab

TOKEN=YOUR_TOKEN_HERE
ADMIN=TELEGRAM_USERNAME
PORT=8080

docker run -t -i -d --publish 8080:$PORT \
    --name tgGitlabBot \
    --network bridge \
    --restart always \
    --env PORT="$PORT" \
    --env TOKEN="$TOKEN" \
    --env ADMIN="$USERNAME" morlov/tg_gitlab

```
