import { exec } from '@cloud-cli/exec';

export async function pull(options: { image: string }) {
  if (!options.image) {
    throw new Error('Image is required');
  }

  return (await exec('docker', ['pull', options.image])).ok;
}

export async function prune() {
  return (await exec('docker', ['image', 'prune', '-f'])).ok;
}
