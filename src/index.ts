import { init } from '@cloud-cli/cli';
import { Resource, SQLiteDriver } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, startContainer, stopContainer, refreshContainer } from './containers.js';
import { addContainer, removeContainer, listContainers, updateContainer, getContainer } from './store.js';
import { pull, prune } from './images.js';

async function reload() {
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
  start: startContainer,
  stop: stopContainer,
  ps: getRunningContainers,
  logs: getLogs,
  reload,
  [init]: reload
}
