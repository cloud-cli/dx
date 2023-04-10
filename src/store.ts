import { Model, Resource, Primary, NotNull, Property, Query } from '@cloud-cli/store';

@Model('container')
export class Container extends Resource {
  @Primary() @NotNull() @Property(Number) id: number;
  @NotNull() @Property(String) name: string;
  @NotNull() @Property(String) image: string;
  @NotNull() @Property(String) ports: string;
  @NotNull() @Property(String) volumes: string;
}

interface ContainerName {
  name: string;
}

interface AddContainerOptions extends ContainerName {
  image: string;
  volumes?: string;
  ports?: string;
}

export async function addContainer(options: AddContainerOptions): Promise<Container> {
  const { name, image } = options;

  if (!name) throw new Error('Name required');
  if (!image) throw new Error('Image required');

  const volumes = (options.volumes ? sanitiseVolumes(options.volumes) : '');
  const ports = (options.ports ? sanitisePorts(options.ports) : '');
  const container = new Container({ name, image, volumes, ports });
  const id = await container.save();

  container.id = id;

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

interface UpdateOptions extends ContainerName {
  ports?: string;
  volumes?: string;
  image?: string;
}
const optionSplitter = /,\s*/;

export async function updateContainer(options: UpdateOptions) {
  let { ports, volumes, name, image } = options;
  const container = await findContainer(name);

  if (!container) {
    throw new Error('Container not found');
  }

  if (ports) {
    container.ports = sanitisePorts(ports)
  }

  if (volumes) {
    container.volumes = sanitiseVolumes(volumes);
  }

  if (image) {
    container.image = image;
  }

  await container.save();
  return container;
}

export async function listContainers() {
  return Resource.find(Container, new Query());
}

export async function findContainer(name: string): Promise<Container | null> {
  const found = await Resource.find(Container, new Query<Container>().where('name').is(name));
  return found[0] || null;
}

const portTester = /^\d+:\d+$/;
function sanitisePorts(ports: string) {
  return ports.split(optionSplitter).map(s => s.trim()).filter(s => portTester.test(s)).join(',');
}

const volumeTester = /^\S+:\S+$/;
function sanitiseVolumes(volumes: string) {
  return volumes.split(optionSplitter).map(s => s.trim()).filter(s => volumeTester.test(s)).join(',');
}