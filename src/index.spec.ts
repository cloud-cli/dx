const execMocks = { exec: jest.fn() };
jest.mock('@cloud-cli/exec', () => execMocks);

import * as exec from '@cloud-cli/exec';
import dx from './index';
import { Resource, SQLiteDriver } from '@cloud-cli/store';
import { Container } from './store';
import { init } from '@cloud-cli/cli';

beforeEach(() => {
  Resource.use(new SQLiteDriver(':memory:'));
  execMocks.exec.mockReset();
  Resource.create(Container);
});

describe('docker images', () => {
  it('should pull an image', async () => {
    execMocks.exec.mockResolvedValueOnce({
      ok: true,
      stdout: '',
    });

    const output = dx.pull({ image: 'test' });

    await expect(output).resolves.toEqual(true);
    expect(execMocks.exec).toHaveBeenCalledWith('docker', ['pull', 'test']);
  });
});

describe('store', () => {
  it('should add/remove a container entry', async () => {
    const expected = {
      id: 1,
      name: 'test',
      image: 'test:latest',
      volumes: '',
      ports: '',
    };
    await expect(dx.add({ name: 'test', image: 'test:latest' })).resolves.toEqual(expected);
    await expect(dx.list()).resolves.toEqual([expected]);

    await expect(dx.remove({ name: 'test' })).resolves.toBe(true);
    await expect(dx.list()).resolves.toEqual([]);

    await expect(dx.remove({ name: 'test' })).rejects.toThrowError('Container not found: test');
  });

  it('should allow updates to ports and volumes', async () => {
    await expect(dx.add({ name: 'test', image: 'test:latest' })).resolves.toBeTruthy();
    await expect(
      dx.update({ name: 'test', ports: '80:80, 8080:8000, invalid:123', volumes: 'local:/tmp, disk:/opt, invalid:' }),
    ).resolves.toEqual({
      id: 1,
      name: 'test',
      image: 'test:latest',
      volumes: 'local:/tmp,disk:/opt',
      ports: '80:80,8080:8000',
    });
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

  describe('run', () => {
    it('should throw an error if name was not given', async () => {
      await expect(dx.run({ name: '' })).rejects.toThrowError(new Error('Name is required'));
    });

    it('should run a container created previously', async () => {
      const container = await dx.add({
        name: 'run-test',
        image: 'test-image:latest',
        ports: '80:80, 8080:8000, invalid:123',
        volumes: 'local:/tmp, disk:/opt, invalid:',
      });

      expect(container.ports).toEqual('80:80,8080:8000');
      expect(container.volumes).toEqual('local:/tmp,disk:/opt');

      await expect(dx.run({ name: 'run-test', env: ['FOO=1', 'BAR=2'] })).resolves.toEqual(true);

      expect(exec.exec).toHaveBeenCalledWith('docker', [
        'run',
        '--rm',
        '--detach',
        '--name',
        'run-test',
        '-vlocal:/tmp',
        '-vdisk:/opt',
        '-p80:80',
        '-p8080:8000',
        '-e',
        'FOO=1',
        '-e',
        'BAR=2',
        'test-image:latest',
      ]);
    });
  });

  describe('stop', () => {
    it('should stop a running container', async () => {
      const name = 'test';
      await expect(dx.stop({ name })).resolves.toBe(true);

      expect(exec.exec).toHaveBeenCalledWith('docker', ['stop', '-t', '5', name]);
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
