export type EnvList = Array<{ key: string; value: string }>;

export async function getEnvVars(vars: EnvList) {
  const envKeys: string[] = [];
  const env = { ...process.env };

  vars.forEach(({ key, value }) => {
    envKeys.push(key);
    env[key] = String(value);
  });

  return { env, envKeys: [...new Set(envKeys)] };
}

export function getListFromString(string: string): string[] {
  return String(string).trim().split('\n').filter(Boolean);
}

export function addExecFlag(list: string[], flag: string) {
  return list
    .filter(Boolean)
    .map((p) => `-${flag}${p}`);
}

export function readTargetName(args) {
  readPositionalArgs(args, 'name');
}

export function readTargetNewName(args) {
  readPositionalArgs(args, 'newName');
}

export function readTargetImage(args) {
  readPositionalArgs(args, 'image');
}

function readPositionalArgs(args, name) {
  if (!args[name]) {
    args[name] = (args._ || []).shift();
  }
}
