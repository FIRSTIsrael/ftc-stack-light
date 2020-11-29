module.exports = {
  scorekeeper: {
    host: 'localhost:80',
    username: 'local',
    password: ''
  },
  events: {
    israel_championship_0: 8080,
    israel_championship_1: 8081,
    israel_championship_2: 8082
  },
  dashboard: {
    active: true,
    port: 5000,
    event: {
      name: 'Israel Championship',
      code: 'israel_championship',
      divisions: ['Weizmann', 'Blass', 'Yonath']
    }
  }
};
