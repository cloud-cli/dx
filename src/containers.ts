import { exec } from '@cloud-cli/exec';
import { findContainer } from './store.js';

export async function getRunningContainers(): Promise<string[]> {
  const ps = await exec('docker', ['ps', '--format', '{{.Names}}']);

  if (!ps.ok) {
    throw new Error('Failed to list containers: ' + ps.stderr);
  }

  return getListFromString(ps.stdout);
}

interface GetLogsOptions {
  name: string;
  lines?: string;
}
export async function getLogs({ name, lines }: GetLogsOptions): Promise<string> {
  if (!name) {
    throw new Error('Name not specified');
  }

  const args = ['logs', name];

  if (lines) {
    args.push('-n', String(Number(lines)));
  }

  const sh = await exec('docker', args);

  if (sh.ok) {
    return sh.stdout;
  }

  return '';
}

interface RunOptions {
  name: string;
  env?: string[];
  ports?: string;
}

const defaultRunOptions = { ports: '', env: [] };

export async function startContainer(options: RunOptions) {
  options = { ...defaultRunOptions, ...options };
  const { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const env = [];
  if (Array.isArray(options.env)) {
    env.push(...options.env.flatMap((e) => ['-e', e]));
  }

  const container = await findContainer(name);
  const volumes = addExecFlag(container.volumes, 'v');
  const ports = addExecFlag(container.ports, 'p');
  const extraPorts = addExecFlag(options.ports, 'p');

  await exec('docker', [
    'run',
    '--rm',
    '--detach',
    '--restart',
    'always',
    '--name',
    name,
    ...volumes,
    ...ports,
    ...extraPorts,
    ...env,
    container.image,
  ]);

  return true;
}

export interface StopOptions {
  name: string;
}
export async function stopContainer(options: StopOptions) {
  if (!options.name) {
    throw new Error('Name is required');
  }

  await exec('docker', ['stop', '-t', '5', options.name]);
  await exec('docker', ['rm', options.name]);

  return true;
}

function getListFromString(string: string): string[] {
  return string.trim().split('\n').filter(Boolean);
}

function addExecFlag(string: string, flag: string) {
  return string
    .split(',')
    .filter(Boolean)
    .map((p) => `-${flag}${p}`);
}
