FROM mhart/alpine-node:base-6
LABEL authors="Michael Orlov <miklergm@gmail.com>"
WORKDIR /tg_gitlab
ADD . .
CMD ["node", "bot.js"]
