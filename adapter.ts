import {
  copyFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  emptyDirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs-extra';
import { join } from 'path';
import { spawnSync } from 'child_process';
import * as esbuild from 'esbuild';

export interface AWSAdapterProps {
  artifactPath?: string;
  autoDeploy?: boolean;
  cdkProjectPath?: string;
  stackName?: string;
  FQDN?: string;
}

export function adapter({
  artifactPath = 'build',
  autoDeploy = false,
  cdkProjectPath = `${__dirname}/deploy/index.js`,
  stackName = '*',
  FQDN,
}: AWSAdapterProps) {
  /** @type {import('@sveltejs/kit').Adapter} */
  return {
    name: 'adapter-awscdk',

    async adapt(builder: any) {
      emptyDirSync(artifactPath);

      const static_directory = join(artifactPath, 'assets');
      if (!existsSync(static_directory)) {
        mkdirSync(static_directory, { recursive: true });
      }

      const prerendered_directory = join(artifactPath, 'prerendered');
      if (!existsSync(static_directory)) {
        mkdirSync(static_directory, { recursive: true });
      }

      const server_directory = join(artifactPath, 'server');
      if (!existsSync(server_directory)) {
        mkdirSync(server_directory, { recursive: true });
      }

      const edge_directory = join(artifactPath, 'edge');
      if (!existsSync(edge_directory)) {
        mkdirSync(edge_directory, { recursive: true });
      }

      builder.log.minor('Copying asset files.');
      builder.writeClient(static_directory);
      builder.writeStatic(static_directory);

      builder.log.minor('Copying server files.');
      builder.writeServer(artifactPath);
      copyFileSync(`${__dirname}/lambda/lambda.js`, `${server_directory}/_index.js`);
      copyFileSync(`${__dirname}/lambda/shims.js`, `${server_directory}/shims.js`);

      builder.log.minor('Building AWS Lambda server function.');
      esbuild.buildSync({
        entryPoints: [`${server_directory}/_index.js`],
        outfile: `${server_directory}/index.js`,
        inject: [join(`${server_directory}/shims.js`)],
        external: ['node:*'],
        format: 'cjs',
        bundle: true,
        platform: 'node',
      });

      builder.log.minor('Prerendering static pages.');
      await builder.prerender({
        dest: prerendered_directory,
      });

      builder.log.minor('Building Lambda@Edge routing function.');
      copyFileSync(`${__dirname}/lambda/router.js`, `${edge_directory}/_index.js`);
      let files = JSON.stringify([...getAllFiles(static_directory), ...getAllFiles(prerendered_directory)]);
      writeFileSync(`${edge_directory}/static.js`, `export default ${files}`);

      esbuild.buildSync({
        entryPoints: [`${edge_directory}/_index.js`],
        outfile: `${edge_directory}/index.js`,
        format: 'cjs',
        bundle: true,
        platform: 'node',
      });

      builder.log.minor('Cleanup project.');
      unlinkSync(`${server_directory}/_index.js`);
      unlinkSync(`${edge_directory}/_index.js`);
      unlinkSync(`${artifactPath}/app.js`);

      builder.log.minor('Deploy using AWS-CDK.');
      autoDeploy &&
        spawnSync('npx', ['cdk', 'deploy', '--app', cdkProjectPath, '*', '--require-approval', 'never'], {
          cwd: __dirname,
          stdio: [process.stdin, process.stdout, process.stderr],
          env: Object.assign(
            {
              SERVER_PATH: join(process.cwd(), server_directory),
              STATIC_PATH: join(process.cwd(), static_directory),
              PRERENDERED_PATH: join(process.cwd(), prerendered_directory),
              EDGE_PATH: join(process.cwd(), edge_directory),
              STACKNAME: stackName,
              FQDN,
            },
            process.env
          ),
        });

      builder.log.minor('Done.');
    },
  };
}

const getAllFiles = function (dirPath: string, basePath?: string, arrayOfFiles: string[] = []) {
  basePath = basePath || dirPath;

  readdirSync(dirPath).forEach(function (file) {
    if (statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, basePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(join('/', dirPath.replace(basePath!, ''), '/', file));
    }
  });

  return arrayOfFiles;
};
