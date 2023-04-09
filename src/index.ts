import { init } from '@cloud-cli/cli';
import { Resource } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, runContainer, stopContainer } from './containers.js';
import { addContainer, removeContainer, listContainers, updateContainer } from './store.js';
import { pull } from './images.js';

async function reload() {
  await Resource.create(Container);
}

export default {
  pull,
  add: addContainer,
  remove: removeContainer,
  list: listContainers,
  update: updateContainer,
  run: runContainer,
  stop: stopContainer,
  ps: getRunningContainers,
  logs: getLogs,
  reload,
  [init]: reload
}