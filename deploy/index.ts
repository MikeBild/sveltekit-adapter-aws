#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { AWSAdapterStack } from '../lib/adapter-stack';

const app = new App();

new AWSAdapterStack(app, process.env.STACKNAME || 'AWSAdapterStack-Default', {
  env: { region: 'us-east-1', account: process.env.CDK_DEFAULT_ACCOUNT },
  FQDN: process.env.FQDN!,
});
