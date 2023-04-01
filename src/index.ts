
import { Container, DockerManager } from './docker-manager.js';

const manager = new DockerManager();

function list() {
  return manager.getRunningContainers();
}

function logs(options: { name: string; lines?: string }) {
  return manager.getLogs(options);
}

export default { list, logs }