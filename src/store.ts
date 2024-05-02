import { Model, Resource, Primary, NotNull, Property, Query } from '@cloud-cli/store';
import { readTargetImage, readTargetName } from './utils.js';

@Model('container')
export class Container extends Resource {
  @Primary() @NotNull() @Property(Number) id: number;
  @NotNull() @Property(String) name: string;
  @NotNull() @Property(String) image: string;
  @NotNull() @Property(String) host: string;
  @NotNull() @Property(String) port: string;
  @NotNull() @Property(String) volumes: string;
}

interface ContainerName {
  _?: string[];
  name: string;
}

interface ContainerUpdateOptions extends ContainerName {
  image: string;
  host?: string;
  volumes?: string;
  port?: string;
}

interface ContainerListOptions {
  name?: string;
  image?: string;
  host?: string;
}

export async function addContainer(options: ContainerUpdateOptions): Promise<Container> {
  readTargetName(options);
  readTargetImage(options);
  const { name, image } = options;

  if (!name) throw new Error('Name required');
  if (!image) throw new Error('Image required');

  const volumes = options.volumes ? sanitiseVolumes(options.volumes) : '';
  const port = options.port || '';
  const host = options.host;
  const container = new Container({ name, image, volumes, port, host });
  const id = await container.save();

  container.id = Number(id);

  return container;
}

export async function removeContainer(options: ContainerName) {
  readTargetName(options);
  const found = await findContainer(options.name);

  if (found) {
    await found.remove();
    return true;
  }

  throw new Error('Container not found: ' + options.name);
}

export async function getContainer(options: ContainerName) {
  readTargetName(options);
  return await findContainer(options.name);
}

const optionSplitter = /,\s*/;

export async function updateContainer(options: Partial<ContainerUpdateOptions>) {
  readTargetName(options);
  let { port, volumes, name, image, host } = options;
  const container = await findContainer(name);

  if (!container) {
    throw new Error('Container not found');
  }

  if (port) {
    container.port = port
  }

  if (volumes) {
    container.volumes = sanitiseVolumes(volumes);
  }

  if (image) {
    container.image = image;
  }

  if (host) {
    container.host = host;
  }

  await container.save();
  return container;
}

export async function listContainers(options: ContainerListOptions) {
  const query = new Query<Container>();
  const keys: Array<keyof Container> = ['name', 'image', 'host', 'port', 'volumes'];
  keys.forEach((key: any) => !options[key] || query.where(key).isLike(options[key]));
  const list = await Resource.find(Container, query);

  return list.sort((a, b) => Number(a.name > b.name) || -1);
}

export async function findContainer(name: string): Promise<Container | null> {
  const found = await Resource.find(Container, new Query<Container>().where('name').is(name));
  return found[0] || null;
}

const volumeTester = /^\S+:\S+$/;
function sanitiseVolumes(volumes: string) {
  return volumes
    .split(optionSplitter)
    .map((s) => s.trim())
    .filter((s) => volumeTester.test(s))
    .join(',');
}
