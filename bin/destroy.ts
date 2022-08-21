#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { join } from 'path';

const artifactPath = 'build';
const static_directory = join(artifactPath, 'assets');
const prerendered_directory = join(artifactPath, 'prerendered');
const server_directory = join(artifactPath, 'server');

(async () => {
  const config = await import(join(__dirname, 'cdk.out', 'cdk-env-vars.json'));
  const [stackName, stackConfig] = Object.entries(config).find((x: any) => x[1]?.appUrl) as [
    string,
    { appUrl: string }
  ];

  spawnSync('npx', ['cdk', 'destroy', '--app', `${__dirname}/../deploy/index.js`, '*', '--force'], {
    cwd: __dirname,
    stdio: [process.stdin, process.stdout, process.stderr],
    env: Object.assign(
      {
        SERVER_PATH: join(process.cwd(), server_directory),
        STATIC_PATH: join(process.cwd(), static_directory),
        PRERENDERED_PATH: join(process.cwd(), prerendered_directory),
        FQDN: stackConfig.appUrl,
        STACKNAME: stackName,
      },
      process.env
    ),
  });
})();
