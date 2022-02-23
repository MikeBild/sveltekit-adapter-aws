# SvelteKit AWS Adapter

## Architecture

![Architecture](architecture.png)

## Configuration

```typescript
export interface AWSAdapterProps {
  cdkProjectPath?: string; // AWS-CDK App file path for AWS-CDK custom deployment applications (e.g. ${process.cwd()}/deploy.js)
  artifactPath?: string; // Build output directory (default: build)
  autoDeploy?: boolean; // Should automatically deploy in SvelteKit build step (default: false)
  stackName?: string; // AWS-CDK CloudFormation Stackname (default: AWSAdapterStack-Default)
  FQDN?: string; // Full qualified domain name of CloudFront deployment (e.g. demo.example.com)
}
```

## Examples

### SvelteKit app only example

**svelte.config.js**

```javascript
import preprocess from 'svelte-preprocess';
import { adapter } from 'sveltekit-adapter-aws';

export default {
  preprocess: preprocess()
  kit: {
    adapter: adapter({
      autoDeploy: true,
      FQDN: 'demo.example.com',
      stackName: 'Demo-Example',
    })
  },
};
```

### Custom AWS-CDK app example

**svelte.config.js**

```javascript
import preprocess from 'svelte-preprocess';
import { adapter } from 'sveltekit-adapter-aws';

export default {
  preprocess: preprocess()
  kit: {
    adapter: adapter({
      autoDeploy: true,
      cdkProjectPath: `${process.cwd()}/deploy.js`,
    })
  },
};
```

**deploy.js**

```javascript
#!/usr/bin/env node

import { App } from '@aws-cdk/core';
import { AWSAdapterStack } from 'sveltekit-adapter-aws';
import { IntrastructureStack } from './infrastructure.js';

const app = new App();
app.region = 'us-east-1';
app.account = process.env.CDK_DEFAULT_ACCOUNT;

const { serverHandler } = new AWSAdapterStack(app, 'AWSAdapterStack', {
  FQDN: 'demo.example.com',
});

new IntrastructureStack(app, 'IntrastructureStack', {
  serverHandler,
});
```
