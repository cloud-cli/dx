import { Request, Resource, Response } from '@cloud-cli/gw';
import { DockerManager } from './docker-manager.js';

export class LogsApi extends Resource {
  constructor(private manager: DockerManager) {
    super();
  }

  async get(request: Request, response: Response): Promise<void> {
    const name = request.url.slice(1);

    if (!name) {
      response.writeHead(400);
      response.end('Container name required');
      return;
    }

    const logs = await this.manager.getLogs({ name });

    response.writeHead(200);
    response.end(JSON.stringify(logs));
  }
}
