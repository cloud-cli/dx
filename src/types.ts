export interface Config {
  dns?: string;
  dockerArgs?: string[];
}

export interface Container {
  name: string;
  image: string;
  domain: string;
  port: string;
  volumes: string;
  worker: boolean;
  startArgs: string;
}

export interface NameAndStatus {
  name: string;
  status: string;
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

export interface RenameOptions extends ExtraOptions {
  name: string;
  newName: string;
}
