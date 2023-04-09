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

export async function run(options: RunOptions) {
  options = {...defaultRunOptions, ...options};
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

/*
async stopContainer({ name }: Container): Promise<void> {
  return void (await this.shellExec('docker', ['stop', '-t', '5', name]));
}

async isRunning({ name }: Container): Promise<boolean> {
  const list = await this.getRunningContainers();

  return list.some((container) => container.name === name);
}

private async getContainerPorts(name: string): Promise<Record<string, number>> {
  const ports = await exec('docker', [
    'inspect',
    '--format',
    '{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}:{{(index $conf 0).HostPort}} {{end}}',
    name,
  ]);

  const output = {};

  const list = ports.stdout.trim().split('\n').filter(Boolean);
  list.forEach((port) => {
    const [hostPortAndProtocol, containerPort] = port.split(':');
    const hostPort = hostPortAndProtocol.split('/')[0];

    output[Number(hostPort)] = Number(containerPort);
  });

  return output;
}*/
export interface ContainerDetails {
  name: string;
  image: string;
  version?: string;
  volumes?: string[];
  ports?: string[];
}

function getListFromString(string: string): string[] {
  return string.trim().split('\n').filter(Boolean);
}
