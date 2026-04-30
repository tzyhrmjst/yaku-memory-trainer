// app.js
const storage = require('./utils/storage');

App({
  onLaunch() {
    storage.init();
  },
  globalData: {
    version: '1.0.0'
  }
});
