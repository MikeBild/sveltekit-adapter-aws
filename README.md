# SvelteKit Adapter AWS

This project contains a SvelteKit adapter to deploy SvelteKit sites to AWS using CDK.

## Architecture

![Architecture](architecture.png)

## How to use?

**TODO: fill in details**

1. init SvelteKit project
2. add [sveltekit-adapter-aws]() to SvelteKit project
3. optionally edit deployment configuration
   - hook site up with other resources
   - add custom domain
   - adjust capacity allocation (TBD)
4. optionally add custom stacks using `cdkProjectPath`

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
			stackName: 'sveltekit-adapter-aws-basic-demo'
		})
	}
};
```

## Development Status

- in development
- adapter interface of SvelteKit still in change
- upgrade using AWS CDK v2
- support additional examples

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

## Links to examples

- [Basic](https://github.com/MikeBild/sveltekit-adapter-aws-basic-example)
- [Advanced](https://github.com/MikeBild/sveltekit-adapter-aws-advanced-example)
