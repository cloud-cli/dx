import getPort from 'get-port';

export type EnvList = Array<{ key: string; value: string }>;

export async function getEnvVars(vars: EnvList) {
  const port = await getPort();
  const envKeys: string[] = [];
  const env = { ...process.env };

  vars.concat({ key: 'PORT', value: String(port) }).forEach(({ key, value }) => {
    envKeys.push(key);
    env[key] = String(value);
  });

  return { env, envKeys: [...new Set(envKeys)] };
}

export function getListFromString(string: string): string[] {
  return String(string).trim().split('\n').filter(Boolean);
}

export function addExecFlag(string: string, flag: string) {
  return string
    .split(',')
    .filter(Boolean)
    .map((p) => `-${flag}${p}`);
}

export function readTargetName(args) {
  readPositionalArgs(args, 'name');
}

export function readTargetImage(args) {
  readPositionalArgs(args, 'image');
}

function readPositionalArgs(args, name) {
  if (!args[name]) {
    args[name] = (args._ || []).shift();
  }
}
