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
import { addContainer, clone, getContainer, listContainers, removeContainer, updateContainer } from "./store.js";
import { help } from "@cloud-cli/cli";
export type { Config } from "./types.js";

function ps(options: { status?: boolean } = {}) {
  if (options.status) {
    return getAllContainers();
  }

  return getRunningContainers();
}

const helpFunction = () => {
  const commands = {
    pull: "--image <image> - Pull a Docker image",
    prune: "- Remove unused Docker images",
    add: "--name <name> --image <image> [--domain <domain>] [--port <port>] [--volumes <mounts>] [--worker] [--startArgs <json>] - Add a container entry",
    clone: "--name <name> --newName <new-name> - Clone a container entry",
    remove: "--name <name> - Remove a container entry",
    rename: "--name <name> --newName <new-name> - Rename a container entry",
    get: "--name <name> - Get a container entry",
    list: "[--name <name>] [--image <image>] [--domain <domain>] [--port <port>] [--volumes <mounts>] - List/filter entries",
    refresh: "--name <name> - Pull and restart a container",
    update:
      "--name <name> [--image <image>] [--domain <domain>] [--port <port>] [--volumes <mounts>] [--worker] [--startArgs <json>] - Update container properties",
    updateAll: "[--image <image>] - Refresh all matching containers",
    startAll: "[--image <image>] - Start all matching containers",
    start: "--name <name> [--worker] [--startArgs <json>] - Start a stored container",
    run: "--name <name> [--startArgs <json>] - Start a container in worker mode",
    stop: "--name <name> - Stop a container",
    stopAll: "[--image <image>] - Stop all matching containers",
    restart: "--name <name> - Restart a container",
    ps: "[--status] - List running containers (include stored stopped containers with status)",
    logs: "--name <name> [--lines <count>] - Read container logs",
  };

  const lines = ["Docker container management", "", "Commands:"];
  for (const [name, desc] of Object.entries(commands)) {
    lines.push(`  dx.${name} ${desc}`);
  }
  return lines.join("\n");
};

export { clone };

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
  clone,
  [help]: helpFunction,
};
