# SvelteKit Adapter AWS

This project contains a SvelteKit adapter to deploy SvelteKit to AWS using AWS-CDK.

## Basic setup example

**svelte.config.js**

```javascript
import { adapter } from 'sveltekit-adapter-aws';
import preprocess from 'svelte-preprocess';

export default {
  preprocess: preprocess(),
  kit: {
    adapter: adapter({
      autoDeploy: true,
      FQDN: 'sveltekit-adapter-aws-basic-demo.example.com',
      stackName: 'sveltekit-adapter-aws-basic-demo',
    }),
  },
};
```

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
  MEMORY_SIZE?: number; // Memory size of SSR lambda in MB (default 128 MB)
  LOG_RETENTION_DAYS?: number; // Log retention in days of SSR lambda (default 7 days)
}
```

## Example usages

- [Basic](https://github.com/MikeBild/sveltekit-adapter-aws-basic-example)
- [Advanced](https://github.com/MikeBild/sveltekit-adapter-aws-advanced-example)
- [Full Workshop Example](https://github.com/MikeBild/serverless-workshop-sveltekit)

## How to use?

1. init SvelteKit project
2. add [sveltekit-adapter-aws]() to SvelteKit project
3. optionally edit deployment configuration
  - add custom domain (FQDN)
  - hook site up with other resources
4. optionally add custom stacks using `cdkProjectPath`
