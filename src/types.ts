
export interface Config {
  dns?: string;
  dockerArgs?: string[];
}

export interface Container {
  name: string;
  image: string;
  host: string;
  port: string;
  volumes: string;
}

export interface ExtraOptions {
  _?: string[];
}

export interface GetLogsOptions extends ExtraOptions {
  name: string;
  lines?: string;
}

export interface ContainerName extends ExtraOptions {
  name: string;
}
