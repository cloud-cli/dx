import type { Container, ExtraOptions } from './types.js';
import { readTargetImage, readTargetName } from './utils.js';
import { getStorage } from '@cloud-cli/cli';

const { get, set, has, remove, getAll } = getStorage<Container>('dx');

interface ContainerName extends ExtraOptions {
  name: string;
}

interface ContainerUpdateOptions extends ContainerName {
  image: string;
  domain?: string;
  volumes?: string;
  port?: string;
}

type ContainerListOptions = Partial<Container>;

export function addContainer(options: ContainerUpdateOptions): Container {
  readTargetName(options);
  readTargetImage(options);
  const { name, image } = options;
  if (!name) throw new Error('Name required');
  if (!image) throw new Error('Image required');

  const volumes = options.volumes ? sanitiseVolumes(options.volumes) : '';
  const port = options.port || '';
  const domain = options.domain || '';
  const container: Container = { name, image, volumes, port, domain };

  set(name, container);

  return container;
}

export function removeContainer(options: ContainerName) {
  readTargetName(options);

  if (has(options.name)) {
    remove(options.name);
    return true;
  }

  throw new Error('Container not found: ' + options.name);
}

export function getContainer(options: ContainerName) {
  readTargetName(options);
  return get(options.name);
}

const optionSplitter = /,\s*/;

export function updateContainer(options: Partial<ContainerUpdateOptions>) {
  readTargetName(options);
  let { port, volumes, name, image, domain } = options;
  const container = get(name);

  if (!container) {
    throw new Error('Container not found');
  }

  if (port) {
    container.port = port;
  }

  if (volumes) {
    container.volumes = sanitiseVolumes(volumes);
  }

  if (image) {
    container.image = image;
  }

  if (domain) {
    container.domain = domain;
  }

  set(container.name, container);
  return container;
}

export function rename(name: string, newName: string) {
  const container = get(name);
  set(newName, container);
  remove(name);
}

export function listContainers(options: ContainerListOptions = {}) {
  const keys: Array<keyof Container> = ['name', 'image', 'domain', 'port', 'volumes'];
  const list = getAll();

  const filtered = keys.reduce((list, key) => {
    if (options[key]) {
      return list.filter((c) => String(c[key]).toLowerCase().includes(options[key].toLowerCase()));
    }

    return list;
  }, list);

  return filtered.sort((a, b) => Number(a.name > b.name) || -1);
}


export function findContainer(name: string) {
  return get(name);
}

const volumeTester = /^\S+:\S+$/;
function sanitiseVolumes(volumes: string) {
  return volumes
    .split(optionSplitter)
    .map((s) => s.trim())
    .filter((s) => volumeTester.test(s))
    .join(',');
}
