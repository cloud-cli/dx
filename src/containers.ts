import { exec } from '@cloud-cli/exec';
import { findContainer, listContainers } from './store.js';
import { getConfig } from './config.js';
import { EnvList, addExecFlag, getEnvVars, getListFromString, getPorts } from './utils.js';
import { ServerParams } from '@cloud-cli/cli';

export async function getRunningContainers(): Promise<string[]> {
  const ps = await exec('docker', ['ps', '--format', '{{.Names}}']);

  if (!ps.ok) {
    throw new Error('Failed to list containers: ' + ps.stderr);
  }

  return getListFromString(ps.stdout).sort();
}

interface GetLogsOptions {
  name: string;
  lines?: string;
}

interface ContainerName {
  name: string;
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

export async function startAll(_: any, cli: any) {
  const list = await listContainers({});
  const running = await getRunningContainers();

  const notRunning = list.filter(({ name }) => !running.includes(name));

  for (const app of notRunning) {
    try {
      await refreshContainer({ name: app.name }, cli);
    } catch {}
  }

  return true;
}

export async function refreshContainer(options: ContainerName, { run }: ServerParams) {
  if (!options.name) {
    throw new Error('Name is required');
  }

  const { name } = options;
  const container = await findContainer(name);

  await run('dx.pull', { image: container.image });
  await run('dx.stop', { name });
  await run('dx.prune', {});
  await run('dx.start', { name });
}

export async function startContainer(options: ContainerName, { run }: ServerParams) {
  const { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const vars = (await run('env.show', { name })) as EnvList;
  const { env, envKeys } = await getEnvVars(vars);

  const container = await findContainer(name);
  const volumes = addExecFlag(container.volumes, 'v');
  const ports = getPorts([...container.ports.split(','), env.PORT + ':' + env.PORT]);

  if (container.host) {
    const domain = container.host;

    await run('px.update', { domain, target: 'http://localhost:' + env.PORT });
    await run('dns.add', { domain });
    await run('dns.reload', {});
  }

  const dnsOption = [];

  if (getConfig('dns')) {
    dnsOption.push('--dns=' + getConfig('dns'));
  }

  const execArgs = [
    'run',
    '--detach',
    '--restart',
    'always',
    '--name',
    name,
    ...dnsOption,
    ...volumes,
    ...ports,
    ...envKeys.map((e) => '-e' + e),
    container.image,
  ];

  const output = await exec('docker', execArgs.filter(Boolean), { env });

  if (!output.ok) {
    throw new Error('Failed to start ' + name);
  }

  return true;
}

export async function stopContainer(options: ContainerName, { run }: ServerParams) {
  let { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const container = await findContainer(name);

  await exec('docker', ['stop', '-t', '5', name]);
  await exec('docker', ['rm', name]);
  await run('dns.remove', { domain: container.host });
  await run('dns.reload', {});

  return true;
}
