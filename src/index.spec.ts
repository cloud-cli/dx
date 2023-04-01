const execMocks = { exec: jest.fn() };
jest.mock('@cloud-cli/exec', () => execMocks);

import dx from './index';
import * as exec from '@cloud-cli/exec';

beforeEach(() => execMocks.exec.mockClear());

describe('docker container management', () => {
  describe('logs', () => {
    it('should return an empty string if failed', async () => {
      execMocks.exec.mockResolvedValueOnce(({
        ok: false,
        stdout: 'Running...',
      }));

      const output = dx.logs({ name: 'test' });

      await expect(output).resolves.toEqual('');
    });

    it('should throw an error', async () => {
      const output = dx.logs({ name: '' });

      await expect(output).rejects.toEqual(new Error('Name not specified'));
      expect(execMocks.exec).not.toHaveBeenCalled();
    });

    it('should retrieve container logs by name', async () => {
      execMocks.exec.mockResolvedValueOnce(({
        ok: true,
        stdout: 'Running...',
      }));

      const output = dx.logs({ name: 'test', lines: '100' });

      await expect(output).resolves.toEqual('Running...');
      expect(execMocks.exec).toHaveBeenCalledWith('docker', ['logs', 'test', '-n', '100']);
    });
  });

  describe('list', () => {
    it('should list containers by name', async () => {
      execMocks.exec.mockResolvedValueOnce(({
        ok: true,
        stdout: 'fancy-potato',
      }));

      execMocks.exec.mockResolvedValueOnce(({
        ok: true,
        stdout: '1234:1235',
      }));

      const output = dx.list();

      await expect(output).resolves.toEqual([{
        name: 'fancy-potato',
        ports: { '1234': 1235 }
      }]);
      expect(exec.exec).toHaveBeenCalledWith('docker', ['ps', '--format', '{{.Names}}']);
    });

    it('should handle errors', async () => {
      execMocks.exec.mockResolvedValueOnce(({
        ok: false,
        stdout: '',
        stderr: 'boom',
      }));

      const output = dx.list();

      await expect(output).rejects.toEqual(new Error('Failed to list containers: boom'));
    });
  });
});