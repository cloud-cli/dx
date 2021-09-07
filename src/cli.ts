import { Documentation, Gateway } from '@cloud-cli/gw';
import { createServer, Server } from 'http';
import { dirname, join } from 'path';
import { URL } from 'url';
import { ContainerApi } from './container-api.js';
import { DockerManager, RunningContainer } from './docker-manager.js';
import { LogsApi } from './logs-api.js';

export interface DockerRunConfiguration {
  host?: string;
  port: number;
}

export class CommandLineInterface {
  private manager = new DockerManager();

  list() {
    return this.manager.getRunningContainers();
  }

  stop(options: RunningContainer) {
    return this.manager.stopContainer(options);
  }

  start(configuration: DockerRunConfiguration): Server {
    const gw = new Gateway();
    const containers = new ContainerApi(this.manager);
    const logs = new LogsApi(this.manager);
    const { port, host = '127.0.0.1' } = configuration;
    const cwd = join(dirname(new URL(import.meta.url).pathname), '..');

    gw.add('docs', new Documentation(cwd));
    gw.add('containers', containers);
    gw.add('logs', logs);

    console.log(`ContainerRunner available at http://${host}:${port}`);
    return createServer((request, response) => gw.dispatch(request, response)).listen(port, host);
  }
}
