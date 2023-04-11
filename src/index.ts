import { init } from '@cloud-cli/cli';
import { Resource } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, startContainer, stopContainer } from './containers.js';
import { addContainer, removeContainer, listContainers, updateContainer, getContainer } from './store.js';
import { pull } from './images.js';

async function reload() {
  await Resource.create(Container);
}

export default {
  pull,
  add: addContainer,
  remove: removeContainer,
  get: getContainer,
  list: listContainers,
  update: updateContainer,
  start: startContainer,
  stop: stopContainer,
  ps: getRunningContainers,
  logs: getLogs,
  reload,
  [init]: reload
}