import { init } from '@cloud-cli/cli';
import { Resource, SQLiteDriver } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, startContainer, stopContainer, refreshContainer, startAll } from './containers.js';
import { addContainer, removeContainer, listContainers, updateContainer, getContainer } from './store.js';
import { pull, prune } from './images.js';

async function initResource() {
  Resource.use(new SQLiteDriver());
  await Resource.create(Container);
}

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

  async [init]() {
    await initResource();
  }
}
