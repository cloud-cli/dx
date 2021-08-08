import { Request, Resource, Response } from '@cloud-cli/gw';
import { DockerManager, RunContainerOptions } from './docker-manager.js';

export class ContainerApi extends Resource {
  body = { json: {} };

  constructor(private manager: DockerManager) {
    super();
  }

  async get(request: Request, response: Response): Promise<void> {
    const name = this.readNameFromUrl(request);
    const list = await this.manager.getRunningContainers();
    const containers = name ? list.filter((container) => container.name === name) : list;

    response.writeHead(200);
    response.end(JSON.stringify(containers));
  }

  async head(request: Request, response: Response): Promise<void> {
    const name = this.readNameFromUrl(request);

    response.writeHead(name && (await this.manager.isRunning({ name })) ? 200 : 404);
    response.end();
  }

  async post(request: Request, response: Response): Promise<any> {
    const options = request.body as RunContainerOptions;

    try {
      await this.manager.run(options);
      response.writeHead(201);
      response.end();
    } catch (error) {
      response.writeHead(400);
      response.end(error.message);
    }
  }

  async delete(request: Request, response: Response) {
    const name = this.readNameFromUrl(request);

    if (!name) {
      response.writeHead(400);
      response.end();
      return;
    }

    try {
      await this.manager.stopContainer({ name });
      response.writeHead(200);
    } catch {
      response.writeHead(500);
    }

    response.end();
  }

  private readNameFromUrl(request: Request) {
    return request.url.slice(request.url.lastIndexOf('/') + 1);
  }
}
