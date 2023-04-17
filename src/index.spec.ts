const execMocks = { exec: jest.fn() };
const getPortMocks = jest.fn();

jest.mock('@cloud-cli/exec', () => execMocks);
jest.mock('get-port', () => getPortMocks);

import * as exec from '@cloud-cli/exec';
import dx from './index';
import { Resource, SQLiteDriver } from '@cloud-cli/store';
import { Container } from './store';
import { init } from '@cloud-cli/cli';

beforeEach(() => {
  Resource.use(new SQLiteDriver(':memory:'));
  execMocks.exec.mockReset();
  Resource.create(Container);

  getPortMocks.mockReturnValue(1234);
});

describe('docker images', () => {
  it('should pull an image', async () => {
    execMocks.exec.mockResolvedValueOnce({ ok: true, stdout: '' });

    const output = dx.pull({ image: 'test' });

    await expect(output).resolves.toEqual(true);
    expect(execMocks.exec).toHaveBeenCalledWith('docker', ['pull', 'test']);
  });

  it('should throw an error if an image was not provided', async () => {
    execMocks.exec.mockResolvedValueOnce({ ok: true, stdout: '' });

    const output = dx.pull({ image: '' });

    await expect(output).rejects.toThrowError('Image is required')
    expect(execMocks.exec).not.toHaveBeenCalled();
  });

  it('should prune old images', async () => {
    execMocks.exec.mockResolvedValueOnce({ ok: true, stdout: '' });

    const output = dx.prune();

    await expect(output).resolves.toEqual(true);
    expect(execMocks.exec).toHaveBeenCalledWith('docker', ['image', 'prune', '-f']);
  });
});

describe('store', () => {
  it('should add/remove a container entry', async () => {
    const expected = {
      id: 1,
      name: 'test',
      host: 'test.com',
      image: 'test:latest',
      volumes: '',
      ports: '',
    };
    await expect(dx.add({ name: '', image: '' })).rejects.toThrowError('Name required');
    await expect(dx.add({ name: 'test', image: '' })).rejects.toThrowError('Image required');
    await expect(dx.add({ name: 'test', image: 'test:latest', host: 'test.com' })).resolves.toEqual(expected);
    await expect(dx.list()).resolves.toEqual([expected]);
    await expect(dx.get({ name: 'test' })).resolves.toEqual(expected);

    await expect(dx.remove({ name: 'test' })).resolves.toBe(true);
    await expect(dx.list()).resolves.toEqual([]);

    await expect(dx.remove({ name: 'test' })).rejects.toThrowError('Container not found: test');
  });

  it('should allow updates to container properties', async () => {
    await expect(dx.add({ name: 'test', image: 'test:latest', host: 'old.com' })).resolves.toBeTruthy();
    await expect(dx.update({ name: 'invalid' })).rejects.toThrowError('Container not found');
    const properties = {
      host: 'new.com',
      name: 'test',
      ports: '80:80, 8080:8000, invalid:123',
      volumes: 'local:/tmp, disk:/opt, invalid:',
      image: 'other:latest',
    };

    const expected = {
      id: 1,
      name: 'test',
      image: 'other:latest',
      volumes: 'local:/tmp,disk:/opt',
      ports: '80:80,8080:8000',
      host: 'new.com',
    };

    await expect(dx.update(properties)).resolves.toEqual(expected);
  });
});

describe('running containers', () => {
  describe('ps', () => {
    it('should list running containers by name', async () => {
      execMocks.exec.mockResolvedValueOnce({
        ok: true,
        stdout: 'fancy-potato',
      });

      const output = dx.ps();

      await expect(output).resolves.toEqual(['fancy-potato']);
      expect(exec.exec).toHaveBeenCalledWith('docker', ['ps', '--format', '{{.Names}}']);
    });

    it('should handle errors', async () => {
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
    it('should return an empty string if failed', async () => {
      execMocks.exec.mockResolvedValueOnce({
        ok: false,
        stdout: 'Running...',
      });

      const output = dx.logs({ name: 'test' });

      await expect(output).resolves.toEqual('');
    });

    it('should throw an error', async () => {
      const output = dx.logs({ name: '' });

      await expect(output).rejects.toEqual(new Error('Name not specified'));
      expect(execMocks.exec).not.toHaveBeenCalled();
    });

    it('should retrieve container logs by name', async () => {
      execMocks.exec.mockResolvedValueOnce({
        ok: true,
        stdout: 'Running...',
      });

      const output = dx.logs({ name: 'test', lines: '100' });

      await expect(output).resolves.toEqual('Running...');
      expect(execMocks.exec).toHaveBeenCalledWith('docker', ['logs', 'test', '-n', '100']);
    });
  });

  describe('update', () => {
    it('should pull the latest of an image, stop and start a container', async () => {
      const run = jest.fn();
      const name = 'update';

      await dx.add({
        name,
        image: 'test-image:latest',
        host: 'run-test.com',
      });

      await expect(dx.refresh({ name }, { run })).resolves.toEqual(undefined);

      expect(run).toHaveBeenCalledWith('dx.stop', { name });
      expect(run).toHaveBeenCalledWith('dx.pull', { image: 'test-image:latest' });
      expect(run).toHaveBeenCalledWith('dx.prune');
      expect(run).toHaveBeenCalledWith('dx.start', { name });
    });
  });

  describe('start', () => {
    it('should throw an error if name was not given', async () => {
      const run = jest.fn(() => []);
      await expect(dx.start({ name: '' }, { run })).rejects.toThrowError(new Error('Name is required'));
    });

    it('should run a container created previously', async () => {
      const container = await dx.add({
        name: 'run-test',
        image: 'test-image:latest',
        host: 'run-test.com',
        ports: '80:80, 8080:8000, invalid:123',
        volumes: 'local:/tmp, disk:/opt, invalid:',
      });

      expect(container.ports).toEqual('80:80,8080:8000');
      expect(container.volumes).toEqual('local:/tmp,disk:/opt');

      const run = jest.fn(() => [
        { key: 'FOO', value: 'one' },
        { key: 'BAR', value: 'two' },
      ]);

      await expect(dx.start({ name: 'run-test' }, { run })).resolves.toEqual(true);

      expect(run).toHaveBeenCalledWith('env.show', { app: 'run-test' });
      expect(run).toHaveBeenCalledWith('px.remove', { domain: 'run-test.com' });
      expect(run).toHaveBeenCalledWith('dns.add', { domain: 'run-test.com' });
      expect(run).toHaveBeenCalledWith('dns.reload');
      expect(run).toHaveBeenCalledWith('px.add', {
        domain: 'run-test.com',
        target: 'http://localhost:1234',
        cors: true,
        redirect: true,
      });

      expect(exec.exec).toHaveBeenCalledWith(
        'docker',
        [
          'run',
          '--detach',
          '--restart',
          'always',
          '--name',
          'run-test',
          '-vlocal:/tmp',
          '-vdisk:/opt',
          '-p80:80',
          '-p1234:1234',
          '-p8080:8000',
          '-eFOO',
          '-eBAR',
          '-ePORT',
          'test-image:latest',
        ],
        { env: { ...process.env, PORT: '1234', FOO: 'one', BAR: 'two' } },
      );
    });
  });

  describe('stop', () => {
    it('should stop a running container', async () => {
      const name = 'stop-test';
      const run = jest.fn();

      await dx.add({
        name: 'stop-test',
        image: 'test-image:latest',
        host: 'run-test.com',
      });

      await expect(dx.stop({ name }, { run })).resolves.toBe(true);

      expect(exec.exec).toHaveBeenCalledWith('docker', ['stop', '-t', '5', name]);
      expect(exec.exec).toHaveBeenCalledWith('docker', ['rm', name]);
      expect(run).toHaveBeenCalledWith('dns.remove', { domain: 'run-test.com' });
      expect(run).toHaveBeenCalledWith('dns.reload');
    });

    it('should throw an error if name is empty', async () => {
      const name = '';
      await expect(dx.stop({ name }, {})).rejects.toThrowError('Name is required');

      expect(exec.exec).not.toHaveBeenCalled();
    });
  });
});

describe('initialisation', () => {
  it('should create resources on init', () => {
    const spy = jest.spyOn(Resource, 'create');
    dx[init]();

    expect(spy).toHaveBeenCalledWith(Container);
  });
});
