import { createApp } from './app.js';
import { getEnv } from './config/env.js';

const env = getEnv();
createApp().listen(env.PORT, () => {
  console.log(`DevBiz API listening on port ${env.PORT}`);
});
