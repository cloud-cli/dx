import { vi, expect, describe, it, beforeEach } from 'vitest';
import dx from './index';
import { exec } from '@cloud-cli/exec';
import { getStorage } from '@cloud-cli/cli';

const execMocks = vi.hoisted(() => ({
  exec: vi.fn(),
  getConfig: vi.fn().mockImplementation(() => ({ dns: '1.2.3.4', dockerArgs: ['--net=bridge'] })),
}));

vi.mock('get-port', () => ({ default: vi.fn().mockReturnValue(1234) }));
vi.mock('@cloud-cli/exec', () => ({ exec: execMocks.exec }));
vi.mock('@cloud-cli/cli', async (original) => {
  const mod: any = await original();
  return {
    ...mod,
    getConfig: execMocks.getConfig,
  };
});

beforeEach(() => void getStorage('dx').reset());

describe('docker images', () => {
  it('should pull an image', async () => {
    execMocks.exec.mockResolvedValueOnce({ ok: true });

    const output = dx.pull({ image: 'test' });

    await expect(output).resolves.toEqual(true);
    expect(execMocks.exec).toHaveBeenCalledWith('docker', ['pull', 'test']);
  });

  it('should throw an error if an image was not provided', async () => {
    execMocks.exec.mockReset();
    execMocks.exec.mockResolvedValueOnce({ ok: true });

    const output = dx.pull({ image: '' });

    await expect(output).rejects.toThrowError('Image is required');
    expect(execMocks.exec).not.toHaveBeenCalled();
  });

  it('should prune old images', async () => {
    execMocks.exec.mockResolvedValueOnce({ ok: true });

    const output = dx.prune();

    await expect(output).resolves.toEqual(true);
    expect(execMocks.exec).toHaveBeenCalledWith('docker', ['image', 'prune', '-f']);
  });
});

describe('store', () => {
  it('should add/remove a container entry', async () => {
    const expected = {
      name: 'test',
      domain: 'test.com',
      image: 'test:latest',
      volumes: '',
      port: '',
    };

    expect(() => dx.add({ name: '', image: '' })).toThrowError('Name required');
    expect(() => dx.add({ name: 'test', image: '' })).toThrowError('Image required');
    expect(dx.add({ name: 'test', image: 'test:latest', domain: 'test.com' })).toEqual(expected);
    expect(dx.list()).toEqual([expected]);
    expect(dx.get({ name: 'test' })).toEqual(expected);

    expect(dx.remove({ name: 'test' })).toBe(true);
    expect(dx.list()).toEqual([]);

    expect(() => dx.remove({ name: 'test' })).toThrowError('Container not found: test');
  });

  it('should list container entries, sorted by name', async () => {
    dx.add({ name: 'zest', image: 'test:latest', domain: 'zest.com' });
    dx.add({ name: 'best', image: 'test:latest', domain: 'best.com' });
    dx.add({ name: 'test', image: 'test:latest', domain: 'test.com' });

    expect(dx.list()).toEqual([
      { name: 'best', image: 'test:latest', domain: 'best.com', volumes: '', port: '' },
      { name: 'test', image: 'test:latest', domain: 'test.com', volumes: '', port: '' },
      { name: 'zest', image: 'test:latest', domain: 'zest.com', volumes: '', port: '' },
    ]);
  });

  it('should list container filtered by name, image or domain', async () => {
    dx.add({ name: 'zest', image: 'zest:latest', domain: 'zest.com' });
    dx.add({ name: 'best', image: 'best:latest', domain: 'best.com' });
    dx.add({ name: 'test', image: 'test:latest', domain: 'test.com' });

    expect(dx.list({ name: 'zest' })).toEqual([
      { name: 'zest', image: 'zest:latest', domain: 'zest.com', volumes: '', port: '' },
    ]);

    expect(dx.list({ image: 'test:latest' })).toEqual([
      { name: 'test', image: 'test:latest', domain: 'test.com', volumes: '', port: '' },
    ]);

    expect(dx.list({ domain: 'best.com' })).toEqual([
      { name: 'best', image: 'best:latest', domain: 'best.com', volumes: '', port: '' },
    ]);
  });

  it('should allow updates to container properties', async () => {
    dx.add({ name: 'test', image: 'test:latest', domain: 'old.com' });
    expect(() => dx.update({ name: 'invalid' })).toThrowError('Container not found');
    const properties = {
      domain: 'new.com',
      name: 'test',
      port: '8081',
      volumes: 'local:/tmp, disk:/opt, invalid:',
      image: 'other:latest',
    };

    const expected = {
      name: 'test',
      image: 'other:latest',
      volumes: 'local:/tmp,disk:/opt',
      port: '8081',
      domain: 'new.com',
    };

    expect(dx.update(properties)).toEqual(expected);
  });
});

describe('running containers', () => {
  describe('ps', () => {
    it('should list running containers by name', async () => {
      execMocks.exec.mockReset();
      execMocks.exec.mockResolvedValueOnce({
        ok: true,
        stdout: 'fancy-potato\naltruist-mango\n\n',
      });

      const output = dx.ps();

      await expect(output).resolves.toEqual(['altruist-mango', 'fancy-potato']);
      expect(exec).toHaveBeenCalledWith('docker', ['ps', '--format', '{{.Names}}']);
    });

    it('should list all containers names and their status', async () => {
      expect(dx.list()).toEqual([]);

      dx.add({ name: 'fancy-potato', image: 'test:latest', domain: 'test.com' });
      dx.add({ name: 'altruist-mango', image: 'test:latest', domain: 'best.com' });

      expect(dx.list().length).toBe(2);

      execMocks.exec.mockReset();
      execMocks.exec.mockResolvedValueOnce({
        ok: true,
        stdout: 'altruist-mango',
      });

      const output = dx.ps({ status: true });

      await expect(output).resolves.toEqual([
        { name: 'altruist-mango', status: 'running' },
        { name: 'fancy-potato', status: 'stopped' },
      ]);
    });

    it('should handle errors', async () => {
      execMocks.exec.mockReset();
      execMocks.exec.mockResolvedValueOnce({
        ok: false,
        stdout: '',
        stderr: 'boom',
      });

      const output = dx.ps();

      await expect(output).rejects.toEqual(new Error('Failed to list containers: boom'));
    });
  });

  describe('logs', () => {
    it('should throw an error', async () => {
      execMocks.exec.mockReset();
      const output = dx.logs({ name: '' });

      await expect(output).rejects.toEqual(new Error('Name not specified'));
      expect(execMocks.exec).not.toHaveBeenCalled();
    });

    it('should retrieve container logs by name', async () => {
      execMocks.exec.mockResolvedValueOnce({
        ok: true,
        stdout: 'Running...',
        stderr: 'Ops!',
      });

      const output = dx.logs({ name: 'test', lines: '100' });

      await expect(output).resolves.toEqual('Running...\n\nOps!');
      expect(execMocks.exec).toHaveBeenCalledWith('docker', ['logs', 'test', '-n', '100']);
    });
  });

  describe('refresh', () => {
    it('should throw an error if name was not given', async () => {
      const run = vi.fn(() => []);
      await expect(dx.refresh({ name: '' }, { run })).rejects.toThrowError(new Error('Name is required'));
    });

    it('should pull the latest of an image, stop and start a container', async () => {
      const run = vi.fn();
      const name = 'update';

      await dx.add({
        name,
        image: 'test-image:latest',
        domain: 'run-test.com',
      });

      await expect(dx.refresh({ name }, { run })).resolves.toEqual(undefined);

      expect(run).toHaveBeenCalledWith('dx.pull', { image: 'test-image:latest' });
      expect(run).toHaveBeenCalledWith('dx.stop', { name });
      expect(run).toHaveBeenCalledWith('dx.prune', {});
      expect(run).toHaveBeenCalledWith('dx.start', { name });
    });
  });

  describe('restart', () => {
    it('should restart a container', async () => {
      const run = vi.fn();
      const name = 'update';

      await dx.add({
        name,
        image: 'test-image:latest',
        domain: 'run-test.com',
      });

      await expect(dx.restart({ name }, { run })).resolves.toEqual(true);

      expect(run).toHaveBeenCalledWith('dx.stop', { name });
      expect(run).toHaveBeenCalledWith('dx.start', { name });
    });

    it('should restart a container using nameless args', async () => {
      const run = vi.fn();
      const name = 'update';

      await dx.add({
        _: [name],
        name: '',
        image: 'test-image:latest',
        domain: 'run-test.com',
      });

      await expect(dx.restart({ _: [name], name: '' }, { run })).resolves.toEqual(true);

      expect(run).toHaveBeenCalledWith('dx.stop', { name });
      expect(run).toHaveBeenCalledWith('dx.start', { name });
    });
  });

  describe('startAll', () => {
    it('should start all containers that are not yet running', async () => {
      const name = 'run-test';
      await dx.add({ name, image: 'test-image:latest' });
      await dx.add({ name: 'another-container', image: 'test-image:latest' });
      execMocks.exec.mockResolvedValueOnce({ ok: true, stdout: 'another-container' });

      const run = vi.fn();
      await expect(dx.startAll({}, { run })).resolves.toBe(true);

      expect(run).toHaveBeenCalledWith('dx.pull', { image: 'test-image:latest' });
      expect(run).toHaveBeenCalledWith('dx.stop', { name });
      expect(run).toHaveBeenCalledWith('dx.prune', {});
      expect(run).toHaveBeenCalledWith('dx.start', { name });
    });
  });

  describe('start', () => {
    it('should throw an error if name was not given', async () => {
      const run = vi.fn(() => []);
      await expect(dx.start({ name: '' }, { run })).rejects.toThrowError(new Error('Name is required'));
    });

    it('should run a container created previously', async () => {
      const container = dx.add({
        name: 'run-test',
        image: 'test-image:latest',
        domain: 'run-test.com',
        port: '',
        volumes: 'local:/tmp, disk:/opt, invalid:',
      });

      expect(container.port).toEqual('');
      expect(container.volumes).toEqual('local:/tmp,disk:/opt');

      execMocks.exec.mockReset();
      execMocks.exec.mockResolvedValueOnce({ ok: true });
      const run = vi.fn((cmd: string) => {
        switch (cmd) {
          case 'env.show':
            return [
              { key: 'FOO', value: 'one' },
              { key: 'BAR', value: 'two' },
            ];
          default:
            return true;
        }
      });

      await expect(dx.start({ name: 'run-test' }, { run })).resolves.toEqual(true);

      expect(run).toHaveBeenCalledWith('env.show', { name: 'run-test' });
      expect(run).toHaveBeenCalledWith('dns.add', { domain: 'run-test.com' });
      expect(run).toHaveBeenCalledWith('px.reload');

      expect(exec).toHaveBeenCalledWith(
        'docker',
        [
          'run',
          '--detach',
          '--restart',
          'always',
          '--name',
          'run-test',
          '--label',
          'px:host=run-test.com',
          '--label',
          'px:path=',
          '--dns=1.2.3.4',
          '--net=bridge',
          '-vlocal:/tmp',
          '-vdisk:/opt',
          '-p1234:1234',
          '-eFOO',
          '-eBAR',
          '-ePORT',
          'test-image:latest',
        ],
        { env: { ...process.env, PORT: '1234', FOO: 'one', BAR: 'two' } },
      );
    });

    it('should run a container with a fixed port', async () => {
      const container = dx.add({
        name: 'port-run-test',
        image: 'port-image:latest',
        domain: '',
        port: '8081',
      });

      expect(container.port).toEqual('8081');

      execMocks.exec.mockReset();
      execMocks.exec.mockResolvedValueOnce({ ok: true });
      const run = vi.fn((cmd: string) => {
        switch (cmd) {
          case 'env.show':
            return [];
          default:
            return true;
        }
      });

      await expect(dx.start({ name: 'port-run-test' }, { run })).resolves.toEqual(true);

      expect(run).toHaveBeenCalledWith('env.show', { name: 'port-run-test' });

      expect(exec).toHaveBeenCalledWith(
        'docker',
        [
          'run',
          '--detach',
          '--restart',
          'always',
          '--name',
          'port-run-test',
          '--dns=1.2.3.4',
          '--net=bridge',
          '-p8081:8081',
          '-ePORT',
          'port-image:latest',
        ],
        { env: { ...process.env, PORT: '8081' } },
      );
    });

    it('should throw an error if container does not exists', async () => {
      const run = vi.fn();
      await expect(dx.start({ name: 'not-found' }, { run })).rejects.toThrow(
        new Error('Container not found: not-found'),
      );
    });

    it('should throw an error if container failed', async () => {
      dx.add({
        name: 'run-test',
        image: 'test-image:latest',
      });

      execMocks.exec.mockResolvedValueOnce({ ok: false });
      const run = vi.fn(() => [
        { key: 'FOO', value: 'one' },
        { key: 'BAR', value: 'two' },
      ]);

      await expect(dx.start({ name: 'run-test' }, { run })).rejects.toThrowError('Failed to start container run-test');
    });
  });

  describe('stop', () => {
    it('should stop a running container', async () => {
      const name = 'stop-test';
      const run = vi.fn();

      dx.add({
        name: 'stop-test',
        image: 'test-image:latest',
        domain: 'run-test.com',
      });

      await expect(dx.stop({ name }, { run })).resolves.toBe(true);
      await expect(dx.stop({ name: 'foo' }, { run })).resolves.toBe(true);

      expect(exec).toHaveBeenCalledWith('docker', ['stop', '-t', '5', name]);
      expect(exec).toHaveBeenCalledWith('docker', ['rm', name]);
      expect(run).toHaveBeenCalledWith('dns.remove', { domain: 'run-test.com' });

      expect(exec).toHaveBeenCalledWith('docker', ['stop', '-t', '5', 'foo']);
      expect(exec).toHaveBeenCalledWith('docker', ['rm', 'foo']);
    });

    it('should throw an error if name is empty', async () => {
      const name = '';
      const run = vi.fn();
      execMocks.exec.mockReset();
      await expect(dx.stop({ name }, { run })).rejects.toThrowError('Name is required');

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
