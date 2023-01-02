import { copyFileSync, unlinkSync, existsSync, mkdirSync, emptyDirSync, readFileSync } from 'fs-extra';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import * as esbuild from 'esbuild';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
const updateDotenv = require('update-dotenv');

export interface AWSAdapterProps {
  artifactPath?: string;
  autoDeploy?: boolean;
  cdkProjectPath?: string;
  stackName?: string;
  esbuildOptions?: any;
  FQDN?: string;
  LOG_RETENTION_DAYS?: number;
  MEMORY_SIZE?: number;
  env?: { [key: string]: string };
}

export function adapter({
  artifactPath = 'build',
  autoDeploy = false,
  cdkProjectPath = `${__dirname}/deploy/index.js`,
  stackName = 'sveltekit-adapter-aws-webapp',
  esbuildOptions = {},
  FQDN,
  LOG_RETENTION_DAYS,
  MEMORY_SIZE,
  env = {},
}: AWSAdapterProps = {}) {
  /** @type {import('@sveltejs/kit').Adapter} */
  return {
    name: 'adapter-awscdk',
    async adapt(builder: any) {
      const environment = config({ path: join(process.cwd(), '.env') });
      emptyDirSync(artifactPath);

      const static_directory = join(artifactPath, 'assets');
      if (!existsSync(static_directory)) {
        mkdirSync(static_directory, { recursive: true });
      }

      const prerendered_directory = join(artifactPath, 'prerendered');
      if (!existsSync(prerendered_directory)) {
        mkdirSync(prerendered_directory, { recursive: true });
      }

      const server_directory = join(artifactPath, 'server');
      if (!existsSync(server_directory)) {
        mkdirSync(server_directory, { recursive: true });
      }

      builder.log.minor('Copying asset files.');
      const clientFiles = await builder.writeClient(static_directory);

      builder.log.minor('Copying server files.');
      await builder.writeServer(artifactPath);
      copyFileSync(`${__dirname}/lambda/serverless.js`, `${server_directory}/_index.js`);
      copyFileSync(`${__dirname}/lambda/shims.js`, `${server_directory}/shims.js`);

      builder.log.minor('Building AWS Lambda server function.');
      esbuild.buildSync({
        entryPoints: [`${server_directory}/_index.js`],
        outfile: `${server_directory}/index.js`,
        inject: [join(`${server_directory}/shims.js`)],
        external: ['node:*', ...(esbuildOptions?.external ?? [])],
        format: esbuildOptions?.format ?? 'cjs',
        bundle: true,
        platform: 'node',
        target: esbuildOptions?.target ?? 'node16',
        treeShaking: true,
      });

      builder.log.minor('Prerendering static pages.');
      const prerenderedFiles = await builder.writePrerendered(prerendered_directory);

      builder.log.minor('Cleanup project.');
      unlinkSync(`${server_directory}/_index.js`);
      unlinkSync(`${artifactPath}/index.js`);

      builder.log.minor('Exporting routes.');

      const routes = [
        ...new Set(
          [...clientFiles, ...prerenderedFiles]
            .map((x) => {
              const z = dirname(x);
              if (z === '.') return x;
              if (z.includes('/')) return undefined;
              return `${z}/*`;
            })
            .filter(Boolean)
        ),
      ];

      writeFileSync(join(artifactPath, 'routes.json'), JSON.stringify(routes));

      builder.log.minor('Deploy using AWS-CDK.');
      autoDeploy &&
        spawnSync(
          'npx',
          [
            'cdk',
            'deploy',
            '--app',
            cdkProjectPath,
            '*',
            '--require-approval',
            'never',
            '--outputsFile',
            join(__dirname, 'cdk.out', 'cdk-env-vars.json'),
          ],
          {
            cwd: __dirname,
            stdio: [process.stdin, process.stdout, process.stderr],
            env: Object.assign(
              {
                PROJECT_PATH: join(process.cwd(), '.env'),
                SERVER_PATH: join(process.cwd(), server_directory),
                STATIC_PATH: join(process.cwd(), static_directory),
                PRERENDERED_PATH: join(process.cwd(), prerendered_directory),
                ROUTES: routes,
                STACKNAME: stackName,
                FQDN,
                LOG_RETENTION_DAYS,
                MEMORY_SIZE,
              },
              process.env,
              env
            ),
          }
        );

      try {
        const rawData = readFileSync(join(__dirname, 'cdk.out', 'cdk-env-vars.json')).toString();
        const data = JSON.parse(rawData);
        const out = Object.keys(data).reduce(
          (p, n) => ({
            ...p,
            ...Object.keys(data[n])
              .filter((x: string) => !x.includes('ExportsOutput'))
              .reduce((p: any, x: string) => {
                p[x.toUpperCase()] = data[n][x];
                return p;
              }, {}),
          }),
          {}
        );

        updateDotenv({ ...environment.parsed, ...out });
        unlinkSync(join(__dirname, 'cdk.out', 'cdk-env-vars.json'));
      } catch {}

      builder.log.minor('AWS-CDK deployment done.');
    },
  };
}
