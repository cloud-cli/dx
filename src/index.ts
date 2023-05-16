import { init } from '@cloud-cli/cli';
import { Resource, SQLiteDriver } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, startContainer, stopContainer, refreshContainer, startAll } from './containers.js';
import { addContainer, removeContainer, listContainers, updateContainer, getContainer } from './store.js';
import { pull, prune } from './images.js';
import { setConfig, Config } from './config';

async function initResource() {
  Resource.use(new SQLiteDriver());
  await Resource.create(Container);
}

export { Config } from './config';

export default {
  pull,
  prune,
  add: addContainer,
  remove: removeContainer,
  get: getContainer,
  list: listContainers,
  refresh: refreshContainer,
  update: updateContainer,
  startAll,
  start: startContainer,
  stop: stopContainer,
  ps: getRunningContainers,
  logs: getLogs,

  async [init](config?: Config) {
    setConfig(config);
    await initResource();
  }
}
