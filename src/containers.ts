import { exec } from '@cloud-cli/exec';
import { ServerParams, getConfig } from '@cloud-cli/cli';
import { findContainer, listContainers } from './store.js';
import { EnvList, addExecFlag, getEnvVars, getListFromString, readTargetName } from './utils.js';
import { Config, ContainerName, GetLogsOptions, NameAndStatus } from './types.js';

export async function getRunningContainers(): Promise<string[]> {
  const ps = await exec('docker', ['ps', '--format', '{{.Names}}']);

  if (!ps.ok) {
    throw new Error('Failed to list containers: ' + ps.stderr);
  }

  const list = getListFromString(ps.stdout).sort();

  return list;
}

export async function getAllContainers(): Promise<NameAndStatus[]> {
  const running = await getRunningContainers();

  return listContainers().map((c) => ({
    name: c.name,
    status: running.includes(c.name) ? 'running' : 'stopped',
  }));
}

export async function getLogs(options: GetLogsOptions): Promise<string> {
  readTargetName(options);
  const { name, lines } = options;

  if (!name) {
    throw new Error('Name not specified');
  }

  const args = ['logs', name];

  if (lines) {
    args.push('-n', String(Number(lines)));
  }

  const sh = await exec('docker', args);

  return [sh.stdout, sh.stderr].join('\n\n').trim();
}

export async function startAll(_: any, cli: any) {
  const list = listContainers();
  const running = (await getRunningContainers()) as string[];
  const notRunning = list.filter(({ name }) => !running.includes(name));

  for (const app of notRunning) {
    try {
      await refreshContainer({ name: app.name }, cli);
    } catch {}
  }

  return true;
}

export async function refreshContainer(options: ContainerName, { run }: ServerParams) {
  readTargetName(options);
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

export async function restartContainer(options: ContainerName, { run }: ServerParams) {
  readTargetName(options);
  const { name } = options;

  await run('dx.stop', { name });
  await run('dx.start', { name });

  return true;
}

export async function startContainer(options: ContainerName, { run }: ServerParams) {
  readTargetName(options);
  const { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  const vars = (await run('env.show', { name })) as EnvList;
  const { env, envKeys } = await getEnvVars(vars);

  const container = findContainer(name);
  const volumes = addExecFlag(container.volumes, 'v');
  const ports = ['-p' + env.PORT + ':' + (container.port || env.PORT)];

  if (container.domain) {
    const [domain] = container.domain.split('/');

    await run('px.update', { domain, target: 'http://localhost:' + env.PORT });
    await run('dns.add', { domain });
  }

  const extraArgs = [];
  const config = await getConfig<Config>('dx');

  if (config.dns) {
    extraArgs.push('--dns=' + config.dns);
  }

  if (config.dockerArgs) {
    extraArgs.push(...config.dockerArgs);
  }

  const execArgs = [
    'run',
    '--detach',
    '--restart',
    'always',
    '--name',
    name,
    ...extraArgs,
    ...volumes,
    ...ports,
    ...envKeys.map((e) => '-e' + e),
    container.image,
  ];

  const output = await exec('docker', execArgs.filter(Boolean), { env });

  if (!output.ok) {
    console.log([output.stdout, output.stderr].join('\n\n'));
    throw new Error('Failed to start ' + name);
  }

  return true;
}

export async function stopContainer(options: ContainerName, { run }: ServerParams) {
  readTargetName(options);
  let { name } = options;

  if (!name) {
    throw new Error('Name is required');
  }

  await exec('docker', ['stop', '-t', '5', name]);
  await exec('docker', ['rm', name]);

  const containers = [findContainer(name)].filter(Boolean);

  for (const container of containers) {
    await run('dns.remove', { domain: container.domain });
  }

  return true;
}
