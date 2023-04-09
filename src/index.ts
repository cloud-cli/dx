import { init } from '@cloud-cli/cli';
import { Resource } from '@cloud-cli/store';
import { Container } from './store.js';
import { getRunningContainers, getLogs, run } from './containers.js';
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
  run,
  ps: getRunningContainers,
  logs: getLogs,
  reload,
  [init]: reload
}