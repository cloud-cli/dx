import { exec } from '@cloud-cli/exec';
import { readTargetImage } from './utils';

export async function pull(options: { image: string }) {
  readTargetImage(options);
  if (!options.image) {
    throw new Error('Image is required');
  }

  return (await exec('docker', ['pull', options.image])).ok;
}

export async function prune() {
  return (await exec('docker', ['image', 'prune', '-f'])).ok;
}
