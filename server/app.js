const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = require('koa-router')();
const logger = require('koa-logger');
const moment = require('moment');


const port = 10010;
const log = console.log.bind(console);

const fs = require('fs');
const path = require('path');

const render = require('koa-ejs');

const moneyDict = {
  one: 10000,
  two: 20000,
  three: 30000,
  four: 40000,
  hacker: 0,
};

const userDict = {
  one: {
    username: 'one',
    password: 'one',
  },
  two: {
    username: 'two',
    password: 'two',
  },
  three: {
    username: 'three',
    password: 'three',
  },
  four: {
    username: 'four',
    password: 'four',
  },
};
const sessionDict = {};


//-------------------------------------------------------------------------
render(app, {
  root: path.join(__dirname, 'views'),
  layout: false,
  viewExt: 'html',
  cache: false,
  debug: true,
});
app.use(logger());

//-------------------------------------------------------------------------


function isPasswordValid(username, password) {
  return username
    && username in userDict
    && userDict[username].password === password;
}

function genSession(username) {
  const id = `session_${username}`;
  const lifetimeInSeconds = 60;
  const expireTime = moment();
  expireTime.add(lifetimeInSeconds, 'seconds');
  const session = {
    id,
    username,
    expireTime,
  };
  sessionDict[id] = session;
  return session;
}

function getSession(sessionId) {
  if (sessionId in sessionDict) {
    return sessionDict[sessionId];
  }
  return false;
}

function clearSession(sessionId) {
  if (sessionId && sessionId in sessionDict) {
    delete sessionDict[sessionId];
  }
}

function isSessionValid(sessionId) {
  if (sessionId in sessionDict) {
    const { id, username, expireTime } = sessionDict[sessionId];
    const now = moment();
    if (now.isBefore(expireTime)) {
      return true;
    }
    clearSession(sessionId);
    return false;
  }
  return false;
}

function giveMoney(from, to, amount) {
  const money = parseInt(amount, 10);
  if (from in moneyDict) {
    moneyDict[from] -= money;
    if (to in moneyDict) {
      moneyDict[to] += money;
    }
    return true;
  }
  return false;
}

//-------------------------------------------------------------------------
// 通用的session检测
function commonRoutine(ctx, success) {
  const token = ctx.cookies.get('token');
  if (isSessionValid(token)) {
    success(ctx);
  } else {
    ctx.response.body = {
      code: 2,
      msg: '未登录',
      data: {},
    };
  }
}

//-------------------------------------------------------------------------
// 页面路由
router.get('/', async (ctx, next) => {
  await ctx.render('index');
});

router.get('/test', async (ctx, next) => {
  await ctx.render('test');
});


//-------------------------------------------------------------------------
// 数据API
router.get('/get_user_balance', async (ctx, next) => {
  ctx.response.body = {
    code: 0,
    msg: 'ok',
    data: moneyDict,
  };
});

router.get('/transfer_money', async (ctx) => {
  const success = (ctx) => {
    const { to, amount } = ctx.request.query;
    const token = ctx.cookies.get('token');
    const from = sessionDict[token].username;
    giveMoney(from, to, amount);
    log(`GET方式, 从${from}转账给${to} 人民币${amount}元 完成了`);
    ctx.response.body = {
      code: 0,
      msg: '转账成功',
      data: ctx.request.query,
    };
  };
  commonRoutine(ctx, success);
});
router.post('/transfer_money', async (ctx) => {
  log('进入了post转账请求处理函数');
  log(ctx.request);
  const success = (ctx) => {
    const { to, amount } = ctx.request.body;
    const token = ctx.cookies.get('token');
    const from = sessionDict[token].username;
    giveMoney(from, to, amount);
    log(`POST方式, 从${from}转账给${to} 人民币${amount}元 完成了`);
    ctx.response.body = {
      code: 0,
      msg: '转账成功',
      data: ctx.request.body,
    };
  };
  commonRoutine(ctx, success);
});

router.post('/login', async (ctx, next) => {
  // 拿到数据
  // 创建一个session
  // log(ctx);
  const query = ctx.request.body;
  const { username, password } = query;
  if (isPasswordValid(username, password)) {
    const session = genSession(username);
    ctx.cookies.set('token', session.id);
    ctx.response.body = {
      code: 0,
      msg: '登录成功',
      data: {
        sessionId: session.id,
        username,
      },
    };
  } else {
    ctx.response.body = {
      code: 1,
      msg: '用户名或者密码错误',
      data: {},
    };
  }
});

router.get('/logout', async (ctx, next) => {
  const success = (ctx) => {
    const token = ctx.cookies.get('token');
    clearSession(token);
    ctx.response.body = {
      code: 0,
      msg: '成功登出',
      data: {},
    };
  };
  commonRoutine(ctx, success);
});
//------------------------------------------------------------------------------

app.use(bodyParser());
app.use(router.routes());
app.listen(10010);


log(`the server is running on port:${port}`);
