const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const debug = (require('dotenv').config().parsed.DEBUG || process.env.DEBUG || 'false').toLowerCase() === 'true' ? true : false
const fetch = require('request-promise-native');
const cron = require('node-cron');
const chalk = require('chalk');
const timezone = process.env.TZ;
const protocol = require('dotenv').config().parsed.ARGOCD_PROTOCOL || process.env.ARGOCD_PROTOCOL || 'http';
const timeout = parseInt(require('dotenv').config().parsed.TIMEOUT || process.env.TIMEOUT) || 5000;
const interval = parseInt(require('dotenv').config().parsed.INTERVAL || process.env.INTERVAL) || timeout;
const argocdHost = require('dotenv').config().parsed.ARGOCD_HOST || process.env.ARGOCD_HOST;
const argocdPort = parseInt(require('dotenv').config().parsed.ARGOCD_PORT || process.env.ARGOCD_PORT) || 80;
const username = require('dotenv').config().parsed.ARGOCD_USERNAME || process.env.ARGOCD_USERNAME;
const password = require('dotenv').config().parsed.ARGOCD_PASSWORD || process.env.ARGOCD_PASSWORD;
const logging = require('./modules/logging');
const argocdRouter = require('./routes/argocd');

global.ready = false;

let getToken = async()=>{
  let body = JSON.stringify({ username, password });
  await fetch({
    uri: `${protocol}://${argocdHost}:${argocdPort}/api/v1/session`,
    method: 'POST',
    body,
    timeout
  })
  .then(res=>{
    console.log(logging('Succeeded in getting token'));
    if (debug) { console.log(JSON.parse(res).token); }
    global.token = JSON.parse(res).token;
    global.ready = true;
  })
  .catch(err=>{
    console.error(logging(err));;
    if (err.error != undefined && err.error.code != undefined && typeof err.error.code === "string" && err.error.code == 'ETIMEDOUT') {
      console.error(logging(`Connecting to ${protocol}://${argocdHost}:${argocdPort} failed.`));;
    } else {
      console.error(logging(err.error));;
    }
  })
}
let tokenCheck = ()=>{
  if (global.token == undefined) { return false; }
  let exp = JSON.parse(Buffer.from(global.token.split('.')[1],'base64').toString('utf8')).exp;
  let expired = (Date.now() >= exp * 1000);
  if (expired) {
    console.error(logging(`Token has been expired.`));;
  }
  return !expired;
}
let sessionCheck = async()=>{
  let result;
  await fetch({
    uri: `${protocol}://${argocdHost}:${argocdPort}/api/v1/session/userinfo`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${global.token}`
    },
    json: true,
    timeout
  })
  .then(res=>{
    if (res.loggedIn) { result = res.loggedIn; } else { result = false; }
  })
  .catch(err=>{
    if (err.error != undefined && err.error.code != undefined && typeof err.error.code === "string" && err.error.code == 'ETIMEDOUT') {
      console.error(logging(`Connecting to ${protocol}://${argocdHost}:${argocdPort} failed.`));;
    } else {
      console.error(logging(err.error));;
    }
    result = false;
  })
  return result;
}

/* Middleware */
app.use(express.json());
app.use(express.urlencoded({extended : false}));

/* Request Log */
if (debug) {
  let color = 0
  app.use((req,_,next)=>{
    if (req.url === '/live' || req.url === '/ready') { next(); return; }
    color === 0
    ? (()=>{ console.log(chalk.red('-----------------------')); color = 1; })()
    : (()=>{ console.log(chalk.blue('-----------------------')); color = 0; })();
    console.log(`scheme: ${req.protocol}`);
    console.log(`method: ${req.method}`);
    console.log(`path: ${req.url}\n`);
    console.log(`headers:`);
    let headers = new Map(Object.entries(req.headers));
    let index = 0;
    for (let iter of headers){
      if (index < headers.size - 1) {
        console.log(`${iter[0]} : ${iter[1]}`);
        index++;
      } else {
        console.log(`${iter[0]} : ${iter[1]}\n`);
      }
    }
    console.log(req.body);
    next();
  });
}

/* Live health check */
app.get('/live', (_,res)=>{
  if (argocdHost && username && password) {
    res.sendStatus(200).end();
  } else {
    console.error(logging('Required env missing.'));;
    res.sendStatus(500).end();
  }
});
/* Ready health check */
setInterval(async()=>{
  if (!tokenCheck() || !await sessionCheck()) {
    global.ready = false;
    getToken();
    return;
  }
  global.ready = true;
}, interval);
app.get('/ready', async(_,res)=>{
  if (global.ready) {
    res.sendStatus(200).end();
  } else {
    res.sendStatus(500).end();
  }
})

/* Token Renewal */
if (timezone == 'Asia/Seoul'){
  cron.schedule('0 0 * * *', ()=>{
    getToken();
  })
} else {
  cron.schedule('0 15 * * *', ()=>{
    getToken();
  })
}
app.get('/login', (_,res)=> {
  getToken();
  res.end();
});

/* Router */
app.use('/', argocdRouter);

/* Server */
app.listen(port,'0.0.0.0',async()=>{
  console.log(logging(`argocd-api-server has been started at port ${port}!`));;
  global.token = require('dotenv').config().parsed.ARGOCD_TOKEN;
});