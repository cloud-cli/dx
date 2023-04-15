import { exec } from '@cloud-cli/exec';
import { findContainer } from './store.js';
import getPort from 'get-port';

export async function getRunningContainers(): Promise<string[]> {
  const ps = await exec('docker', ['ps', '--format', '{{.Names}}']);

  if (!ps.ok) {
    throw new Error('Failed to list containers: ' + ps.stderr);
  }

  return getListFromString(ps.stdout);
}

type EnvList = Array<{ key: string; value: string }>;

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
  env?: string[] | string;
  ports?: string;
}

const defaultRunOptions = { ports: '', env: [] };

export async function startContainer(options: RunOptions, { run }: any) {
  options = { ...defaultRunOptions, ...options };
  const { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const vars = (await run('env.show', { app: name })) as EnvList;
  const { env, envKeys } = await getEnvVars(options.env, vars);

  const container = await findContainer(name);
  const volumes = addExecFlag(container.volumes, 'v');
  const ports = getPorts([...container.ports.split(','), ...options.ports.split(','), env.PORT + ':' + env.PORT]);

  if (container.host) {
    await run('px.remove', { domain: container.host });
    await run('px.add', { domain: container.host, target: 'http://localhost:' + env.PORT, cors: true, redirect: true });
  }

  await exec(
    'docker',
    [
      'run',
      '--detach',
      '--restart',
      'always',
      '--name',
      name,
      ...volumes,
      ...ports,
      ...envKeys.map((e) => '-e' + e),
      container.image,
    ],
    { env },
  );

  return true;
}

function getPorts(ports: string[]) {
  const map: Record<string, string> = {};

  ports.forEach((str) => {
    const [left, right] = str.split(':');
    map[left] = right;
  });

  return Object.entries(map).map(([left, right]) => '-p' + left + ':' + right);
}

async function getEnvVars(inputEnv: string | string[], vars: EnvList) {
  const port = await getPort();
  const envVars: EnvList = vars.concat({ key: 'PORT', value: String(port) });

  const additionalEnv = typeof inputEnv === 'string' ? [inputEnv] : inputEnv;
  if (Array.isArray(additionalEnv)) {
    additionalEnv.forEach((str) => {
      const [key, value = ''] = str.split('=');
      envVars.push({ key, value });
    });
  }

  const envKeys: string[] = [];
  const env: Record<string, any> = {};
  envVars.forEach(({ key, value }) => {
    envKeys.push(key);
    env[key] = String(value);
  });

  return { env, envKeys: [...new Set(envKeys)] };
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
