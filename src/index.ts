import {
  getAllContainers,
  getLogs,
  getRunningContainers,
  refreshContainer,
  restartContainer,
  startAll,
  updateAll,
  startContainer,
  stopAll,
  stopContainer,
  renameContainer,
  runContainer,
} from './containers.js';
import { prune, pull } from './images.js';
import { addContainer, getContainer, listContainers, removeContainer, updateContainer } from './store.js';
export type { Config } from './types.js';

function ps(options: { status?: boolean } = {}) {
  if (options.status) {
    return getAllContainers();
  }

  return getRunningContainers();
}

export default {
  pull,
  prune,
  add: addContainer,
  remove: removeContainer,
  rename: renameContainer,
  get: getContainer,
  list: listContainers,
  refresh: refreshContainer,
  update: updateContainer,
  updateAll,
  startAll,
  start: startContainer,
  run: runContainer,
  stopAll,
  stop: stopContainer,
  restart: restartContainer,
  ps: ps,
  logs: getLogs,
  help: {
    description: 'Docker container management',
    commands: {
      pull: 'Pull a docker image (requires image argument)',
      prune: 'Prune old docker images',
      add: 'Add a container entry (requires name and image)',
      remove: 'Remove a container entry',
      rename: 'Rename a container entry',
      get: 'Get a container entry',
      list: 'List container entries',
      refresh: 'Refresh/update a container',
      update: 'Update container properties',
      updateAll: 'Update all containers matching an image filter',
      startAll: 'Start all containers',
      start: 'Start a container (requires name)',
      run: 'Run a new container',
      stop: 'Stop a running container',
      stopAll: 'Stop all running containers',
      restart: 'Restart a container',
      ps: 'List containers (use { status: true } to show all with status)',
      logs: 'Get container logs (requires name, optional lines)',
    },
  },
};
