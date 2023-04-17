import getPort from 'get-port';

export type EnvList = Array<{ key: string; value: string }>;

export function getPorts(ports: string[]) {
  const map: Record<string, string> = {};

  ports.filter(Boolean).forEach((str) => {
    const [left, right] = str.split(':');
    map[left] = right;
  });

  return Object.entries(map).map(([left, right]) => '-p' + left + ':' + right);
}

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
  return string.trim().split('\n').filter(Boolean);
}

export function addExecFlag(string: string, flag: string) {
  return string
    .split(',')
    .filter(Boolean)
    .map((p) => `-${flag}${p}`);
}