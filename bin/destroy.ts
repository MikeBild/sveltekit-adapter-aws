#!/usr/bin/env node
import { spawnSync } from 'child_process';

const cdkProjectPath = `${__dirname}/deploy/index.js`;

spawnSync('npx', ['cdk', 'destroy', '--app', cdkProjectPath, '*', '--require-approval', 'never'], {
  cwd: __dirname,
  stdio: [process.stdin, process.stdout, process.stderr],
});
