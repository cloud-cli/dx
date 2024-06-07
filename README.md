## DX

Run Docker containers

## Install

```
npm i @cloud-cli/dx
```

## Usage

```bash
cy dx.list
cy dx.prune
cy dx.pull --image node:latest
cy dx.add --name node-app --image node:latest --volumes 'volume:/container/path' --port ':80' --domain 'foo.example.com'
cy dx.start --name node-app
cy dx.logs --name node-app
cy dx.stop --name node-app
cy dx.remove --name node-app
```

## Options

| Option | Description |
|-|-|
| name | Required. Container name |
| image | Required: Container image |
| volumes | Comma-separated list of volume bindings |
| port | Empty = random port. `:port` = random host port. `number` = fixed port on host and container |
| domain | Domain to bind this container to. Requires `@cloud-cli/px` and `@cloud-cli/dns` |
