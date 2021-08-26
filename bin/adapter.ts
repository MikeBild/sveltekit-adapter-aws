#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { AdapterStack } from '../lib/adapter-stack';

const app = new cdk.App();
new AdapterStack(app, `${process.env.NAMESPACE}-SvelteKitAdapterStack`, {
  env: {
    account: process.env.ACCOUNT,
    region: process.env.REGION,
  },
  serverPath: process.env.SERVER_PATH!,
  staticPath: process.env.STATIC_PATH!,
});
