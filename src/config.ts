export interface Config {
  dns?: string;
}

const config: Config = {};

export function setConfig(newConfig: Config) {
  if (newConfig) {
    Object.assign(config, newConfig);
  }
}

export function getConfig(name: keyof Config) {
  return config[name];
}