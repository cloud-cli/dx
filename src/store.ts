import { Model, Resource, Primary, NotNull, Property, Query } from '@cloud-cli/store';

@Model('container')
export class Container extends Resource {
  @Primary() @NotNull() @Property(Number) id: number;
  @NotNull() @Property(String) name: string;
  @NotNull() @Property(String) image: string;
  @NotNull() @Property(String) host: string;
  @NotNull() @Property(String) ports: string;
  @NotNull() @Property(String) volumes: string;
}

interface ContainerName {
  name: string;
}

interface AddContainerOptions extends ContainerName {
  image: string;
  host?: string;
  volumes?: string;
  ports?: string;
}

export async function addContainer(options: AddContainerOptions): Promise<Container> {
  const { name, image } = options;

  if (!name) throw new Error('Name required');
  if (!image) throw new Error('Image required');

  const volumes = options.volumes ? sanitiseVolumes(options.volumes) : '';
  const ports = options.ports ? sanitisePorts(options.ports) : '';
  const host = options.host;
  const container = new Container({ name, image, volumes, ports, host });
  const id = await container.save();

  container.id = Number(id);

  return container;
}

export async function removeContainer(options: ContainerName) {
  const found = await findContainer(options.name);

  if (found) {
    await found.remove();
    return true;
  }

  throw new Error('Container not found: ' + options.name);
}

export async function getContainer(options: ContainerName) {
  return await findContainer(options.name);
}

interface UpdateOptions extends ContainerName {
  ports?: string;
  volumes?: string;
  image?: string;
  host?: string;
}
const optionSplitter = /,\s*/;

export async function updateContainer(options: UpdateOptions) {
  let { ports, volumes, name, image, host } = options;
  const container = await findContainer(name);

  if (!container) {
    throw new Error('Container not found');
  }

  if (ports) {
    container.ports = sanitisePorts(ports);
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

interface ListOptions {
  name?: string;
  image?: string;
  host?: string;
}

export async function listContainers(options: ListOptions) {
  const query = new Query<Container>();
  ['name', 'image', 'host'].forEach((key: any) => !options[key] || query.where(key).is(options[key]));
  const list = await Resource.find(Container, query);

  return list.sort((a, b) => Number(a.name > b.name) || -1);
}

export async function findContainer(name: string): Promise<Container | null> {
  const found = await Resource.find(Container, new Query<Container>().where('name').is(name));
  return found[0] || null;
}

const portTester = /^\d+:\d+$/;
function sanitisePorts(ports: string) {
  return ports
    .split(optionSplitter)
    .map((s) => s.trim())
    .filter((s) => portTester.test(s))
    .join(',');
}

const volumeTester = /^\S+:\S+$/;
function sanitiseVolumes(volumes: string) {
  return volumes
    .split(optionSplitter)
    .map((s) => s.trim())
    .filter((s) => volumeTester.test(s))
    .join(',');
}
