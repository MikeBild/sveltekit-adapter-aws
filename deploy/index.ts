#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import { AWSAdapterStack } from '../lib/adapter-stack';

const app = new App();
Tags.of(app).add('app', 'sveltekit-adapter-aws-webapp');

new AWSAdapterStack(app, process.env.STACKNAME || 'sveltekit-adapter-aws-webapp', {
  FQDN: process.env.FQDN!,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
