import { exec } from '@cloud-cli/exec';

export async function pull(options: { image: string }) {
  return (await exec('docker', ['pull', options.image])).ok;
}

export async function prune() {
  return (await exec('docker', ['image', 'prune', '-f'])).ok;
}
