import { exec, ExecOptions } from '@cloud-cli/exec';

export interface Container {
  name: string;
}

export interface RunningContainer extends Container {
  ports: Record<string, string | number>;
}

export interface RunContainerOptions {
  name: string;
  image: string;
  version?: string;
  command?: string[];
  volumes?: Record<string, string>;
  ports?: Record<string, string | number>;
  env?: Record<string, string>;
  args?: Record<string, string>;
}

export class DockerManager {
  async getRunningContainers(): Promise<RunningContainer[]> {
    const ps = await exec('docker', ['ps', '--format', '{{.Names}}']);
    const containers = [] as RunningContainer[];

    if (!ps.ok) {
      throw new Error('Failed to list containers: ' + ps.stderr);
    }

    const list = ps.stdout.trim().split('\n').filter(Boolean);

    for (const name of list) {
      containers.push({
        name,
        ports: await this.getContainerPorts(name),
      });
    }

    return containers;
  }

  async getLogs({ name, lines }: Container & { lines?: string }): Promise<string> {
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

  /*async getImages(): Promise<string[]> {
    const list = await this.shellExec('docker', ['image', 'ls', '--format', '{{.Repository}}']);

    return list.filter((s: string) => s !== '<none>');
  }

  async run(options: RunContainerOptions): Promise<RunningContainer> {
    const { name, image, command = [] } = options;
    const env = options.env || {};

    if (!image) {
      throw new Error('Image is required');
    }

    // TODO security clean up
    const args = Object.entries(options.args || {}).map((entry) => `--${entry[0]} ${entry[1]}`);
    const volumes = Object.entries(options.volumes || {}).map((entry) => `-v${entry[0]}:${entry[1]}`);
    const ports = Object.entries(options.ports || {}).map((entry) => `-p${entry[0]}:${entry[1]}`);
    const envKeys = Object.keys(env).map((key) => `--env ${key}`);

    await this.shellExec(
      'docker',
      ['run', '--name', name, '--rm', '--detach', ...ports, ...volumes, ...envKeys, ...args, image, ...command],
      { env },
    );

    return {
      name,
      ports: options.ports || {},
    };
  }

  async stopContainer({ name }: Container): Promise<void> {
    return void (await this.shellExec('docker', ['stop', '-t', '5', name]));
  }

  async isRunning({ name }: Container): Promise<boolean> {
    const list = await this.getRunningContainers();

    return list.some((container) => container.name === name);
  }*/

  private async getContainerPorts(name: string): Promise<Record<string, number>> {
    const ports = await exec('docker', [
      'inspect',
      '--format',
      '{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}:{{(index $conf 0).HostPort}} {{end}}',
      name,
    ]);

    const output = {};

    // if (!ports.ok) return;

    const list = ports.stdout.trim().split('\n').filter(Boolean);
    list.forEach((port) => {
      const [hostPortAndProtocol, containerPort] = port.split(':');
      const hostPort = hostPortAndProtocol.split('/')[0];

      output[Number(hostPort)] = Number(containerPort);
    });

    return output;
  }
}
