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
}

const defaultRunOptions = { env: [] };

export async function runContainer(options: RunOptions) {
  options = { ...defaultRunOptions, ...options };
  const { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const container = await findContainer(name);
  const env = options.env.flatMap((e) => ['-e', e]);

  const volumes = container.volumes
    .split(',')
    .filter(Boolean)
    .map((v) => `-v${v}`);

  const ports = container.ports
    .split(',')
    .filter(Boolean)
    .map((p) => `-p${p}`);

  await exec('docker', ['run', '--rm', '--detach', '--name', name, ...volumes, ...ports, ...env, container.image]);

  return true;
}

export interface StopOptions { name: string; }
export async function stopContainer(options: StopOptions) {
  await exec('docker', ['stop', '-t', '5', options.name]);

  return true;
}

function getListFromString(string: string): string[] {
  return string.trim().split('\n').filter(Boolean);
}
