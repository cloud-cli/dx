## DX

Run Docker containers

#### Usage

As a module:

```ts
import dx from '@cloud-cli/dx';

dx.start({ port: 4567 });
dx.run({
  name: 'run-node',
  image: 'node',
  command: ['node', '--version'],

  volumes: {
    '/tmp/volume': '/container/path',
  },

  env: {
    FOO: 'bar',
  },
});
```

With Cloudy CLI:

```ts
import dx from '@cloud-cli/dx';
import { cli } from '@cloud-cli/cy';

cli.add('dx', dx);
```

**start() options**

| Property | Type   | Default     |
| -------- | ------ | ----------- |
| `host`   | String | '127.0.0.1' |
| `port`   | Number |             |

#### HTTP API

**Run container**

```
POST /containers

{
  "name": "run-node",
  "image": "node",
  "command": ["node", "--version"],

  "volumes": {
    "/tmp/volume": "container/path",
  },

  "env": {
    "FOO": "bar",
  }
}
```

**Stop container**

```
DELETE /containers/run-node
```

**List containers**

```
GET /containers
```

**Get container details**

```
GET /containers/run-node
```

**Get logs from container**

```
GET /logs/run-node
```
