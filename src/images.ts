import { exec } from '@cloud-cli/exec';

export async function pull(options: { image: string }) {
  return (await exec('docker', ['pull', options.image])).ok;
}

/*
async getImages(): Promise<string[]> {
  const list = await this.shellExec('docker', ['image', 'ls', '--format', '{{.Repository}}']);

  return list.filter((s: string) => s !== '<none>');
}
*/