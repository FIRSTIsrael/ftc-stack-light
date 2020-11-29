const nodeFetch = require('node-fetch');
const fetch = require('fetch-cookie')(nodeFetch);
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { parse } = require('node-html-parser');
const { host: scorekeeperIp, username, password } = require('./config').scorekeeper;
const { dashboard, events } = require('./config');

const debugWebSockets = false;

const dashboardApp = express();
const broadcasts = {};
let lastPrint = '';
const log = (data) => {
  if (data !== lastPrint) {
    lastPrint = data;
    console.log(data);
  }
};

for (const eventCode of Object.keys(events)) {
  const wsPort = events[eventCode];

  let isScorekeeperLogin = false;
  let schedule = [];
  let pickupControllersTimer;
  let teleopStartTimer;
  let matchEndTimer;

  const wss = new WebSocket.Server({
    port: wsPort
  });
  const wssBroadcast = (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  broadcasts[eventCode] = wssBroadcast;

  const callback = (type, matchName, field, payload) => {
    // [ color, field, state, seconds]
    const red = (state, seconds) => wssBroadcast(['red', field, state, seconds]);
    const blue = (state, seconds) => wssBroadcast(['blue', field, state, seconds]);
    const amber = (state, seconds) => wssBroadcast(['amber', field, state, seconds]);
    const green = (state, seconds) => wssBroadcast(['green', field, state, seconds]);

    switch (type) {
      case 'MATCH_POST':
        return log(matchName + ' - Score posted');
      case 'MATCH_COMMIT':
        return log(matchName + ' - Score is ready');
      case 'SCORE_SUBMITTED':
        green('blink', 15);
        return log(matchName + ' - Score submitted by the refs');
      case 'MATCH_END':
        red('off');
        blue('off');
        amber('off');
        green('off');
        return log(matchName + ' - Match ended');
      case 'MATCH_ABORT':
        red('blink', 10);
        blue('off');
        amber('blink', 10);
        green('off');
        return log(matchName + ' - Match aborted');
      case 'TELEOP_START':
        red('on');
        blue('on');
        return log(matchName + ' - Teleop started');
      case 'PICKUP_CONTROLLERS':
        red('blink');
        blue('blink');
        return log(matchName + ' - Announced pickup controllers');
      case 'MATCH_START':
        red('off');
        blue('off');
        amber('off');
        green('on');
        return log(matchName + ' - Match running');
      case 'MATCH_READY':
        // green('blink');
        return log(matchName + ' - Waiting for start');
      case 'RANDOMIZE':
        amber('blink');
        setTimeout(() => amber('on'), 8 * 1000);
        return log(matchName + ' - Randomized');
      case 'WAIT_RANDOM':
        return log(matchName + ' - Waiting for Randomizing');
      case 'MATCH_INIT':
        const { redInit, blueInit } = payload;
        log(
          `${matchName} - Waiting for ${!redInit ? 'RED' : ''}${!redInit && !blueInit ? ' AND ' : ''}${
            !blueInit ? 'BLUE' : ''
          } `
        );
        red(redInit ? 'on' : 'off');
        blue(blueInit ? 'on' : 'off');
        if (!redInit || !blueInit) green('off');
        return;
    }
  };

  scorekeeperLogin().then(async (Cookie) => {
    const wsOptions = { headers: { Cookie } };
    console.log(eventCode + ' is running on port ' + wsPort);
    await fetchMatches();
    setInterval(fetchMatches, 10 * 60 * 1000); // Update schedule evey 10 minutes

    new WebSocket(`ws://${scorekeeperIp}/apiv2/stream/?code=${eventCode}`).on('message', (data) => {
      data = JSON.parse(data);
      const field = data.payload.field;
      if (debugWebSockets) console.log('[API WS]', data.updateType);
      if (data.updateType === 'MATCH_START') {
        pickupControllersTimer = setTimeout(() => {
          callback('PICKUP_CONTROLLERS', data.payload.shortName, field);
        }, 30 * 1000);
        teleopStartTimer = setTimeout(() => {
          callback('TELEOP_START', data.payload.shortName, field);
        }, 38 * 1000);
        matchEndTimer = setTimeout(() => {
          callback('MATCH_END', data.payload.shortName, field);
        }, 158 * 1000);
      } else if (data.updateType === 'MATCH_ABORT') {
        clearTimeout(pickupControllersTimer);
        clearTimeout(teleopStartTimer);
        clearTimeout(matchEndTimer);
        pickupControllersTimer = null;
        teleopStartTimer = null;
        matchEndTimer = null;
      }
      callback(data.updateType, data.payload.shortName, field, data.payload);
    });

    new WebSocket(`ws://${scorekeeperIp}/stream/control/schedulechange/?code=${eventCode}`, null, wsOptions).on(
      'message',
      (data) => {
        data = JSON.parse(data);
        if (debugWebSockets) console.log('[CONTROL WS]', data.type);
        const name = getMatchName(data.params[0]);
        if (data.type === 'MATCH_INIT') {
          const [match, redInit, blueInit] = data.params;
          getMatch(match).then((matchData) => {
            const field = matchData.field;
            callback(data.type, name, field, { redInit, blueInit });
            // if (redInit && blueInit) {
            //   if (matchData.randomization > -1) {
            //     callback('MATCH_READY', name, field);
            //   } else {
            //     callback('WAIT_RANDOM', name, field);
            //   }
            // }
          });
        } else if (data.type === 'REVIEW_SUBMITTED') {
          // Red & Blue
          if (data.params[8] && data.params[9]) {
            callback('SCORE_SUBMITTED', name, data.params[4]);
          }
        }
      }
    );

    new WebSocket(`ws://${scorekeeperIp}/stream/display/command/?code=${eventCode}`, null, wsOptions).on(
      'message',
      (data) => {
        data = JSON.parse(data);
        if (debugWebSockets) console.log('[DISPLAY WS]', data.type);
        const name = getMatchName(data.params[0]);
        const field = data.params[2];
        if (data.type === 'RANDOMIZE') {
          callback('RANDOMIZE', name, field);
        }
      }
    );
  });

  function scorekeeperLogin() {
    return fetch(`http://${scorekeeperIp}/callback/`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'manual',
      body: `username=${username}&password=${password}&submit=Login&client_name=FormClient`,
      method: 'POST'
    }).then((res) => {
      isScorekeeperLogin = true;
      return res.headers.raw()['set-cookie'][0].split(';')[0];
    });
  }

  async function fetchMatches() {
    if (!isScorekeeperLogin) await scorekeeperLogin();
    return fetch(`http://${scorekeeperIp}/event/${eventCode}/control/schedule/`)
      .then((res) => res.json())
      .then((res) => res.schedule);
  }

  function getMatch(id) {
    return fetchMatches().then((list) => list[id - 1]);
  }

  function getMatchName(id) {
    if (schedule[id - 1]) return schedule[id - 1].shortName;
    return 'Q' + id;
  }
}

if (dashboard.active) {
  dashboardApp.set('view engine', 'html');
  dashboardApp.engine('html', require('ejs').renderFile);
  const viewsPath = path.join(__dirname, 'dashboard') + '/';

  if (dashboard.event.divisions) {
    dashboardApp.get('/', (req, res) => {
      res.render(viewsPath + 'home.html', {
        eventName: dashboard.event.name,
        divisions: dashboard.event.divisions
      });
    });
    dashboardApp.get('/:division', (req, res) => {
      const division = parseInt(req.params.division) || 0;
      res.render(viewsPath + 'event.html', {
        eventName: dashboard.event.name,
        divisionName: dashboard.event.divisions[division],
        eventCode: `${dashboard.event.code}_${division}`
      });
    });
  } else {
    dashboardApp.get('/', (req, res) => {
      res.render(viewsPath + 'event.html', {
        eventName: dashboard.event.name,
        divisionName: null,
        eventCode: dashboard.event.code
      });
    });
  }

  dashboardApp.get('/api/:event/cycle', async (req, res) => {
    let difference = 'Unknown';
    const html = await fetch(`http://${scorekeeperIp}/event/${req.params.event}/reports/cycle/`).then((res) =>
      res.text()
    );
    try {
      const root = parse(html);
      const table = root.querySelector('#report table');
      table.querySelectorAll('tr').forEach((row, index) => {
        if (index === 0) return;
        const diffText = row.childNodes[15].text.trim();
        if (diffText) difference = diffText;
      });
      const avgCycleTime = root.querySelectorAll('#report div')[1].querySelector('.col-2').text || 'Unknown';
      res.json({ difference, avgCycleTime });
    } catch (error) {
      res.json({ difference: 'Unknown', avgCycleTime: 'Unknown' });
    }
  });
  dashboardApp.get('/api/:event/reset/:field', async (req, res) => {
    const feild = parseInt(req.params.field);
    console.log(`[${req.params.event}] Reset Field #${feild}`);
    const wssBroadcast = broadcasts[req.params.event];
    wssBroadcast(['green', feild, 'blink', 15]);
    res.send('');
  });
  dashboardApp.listen(dashboard.port, () => console.log('Dashboard is running on port ' + dashboard.port));
}
