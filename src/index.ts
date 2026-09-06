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
} from "./containers.js";
import { prune, pull } from "./images.js";
import {
  addContainer,
  getContainer,
  listContainers,
  removeContainer,
  updateContainer,
} from "./store.js";
export type { Config } from "./types.js";

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
};
