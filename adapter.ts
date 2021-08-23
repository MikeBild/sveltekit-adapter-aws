import * as path from "path";
import * as fs from "fs";
import { build } from "esbuild";
import { spawnSync } from "child_process";
import { Adapter } from "@sveltejs/kit";

const rmRecursive = (p: string) => {
  if (!fs.existsSync(p)) return;
  const stats = fs.statSync(p);
  if (stats.isDirectory()) {
    fs.readdirSync(p).forEach((f) => {
      rmRecursive(path.join(p, f));
    });
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
};

export default {
  name: "adapter-aws",
  async adapt({ utils, config }: any): Promise<void> {
    const contentPath = path.join(__dirname, "output");
    rmRecursive(contentPath);
    const serverPath = path.join(contentPath, "server");
    const staticPath = path.join(contentPath, "static");
    utils.copy_server_files(serverPath);
    utils.copy_client_files(staticPath);
    utils.copy_static_files(staticPath);

    await build({
      entryPoints: [path.join(__dirname, "lambda", "index.js")],
      outdir: path.join(contentPath, "server-bundle"),
      bundle: true,
      platform: "node",
      inject: [path.join(__dirname, "./lambda/shims.js")],
    });

    const cdkProc = spawnSync(
      "npx",
      [
        "cdk",
        "deploy",
        "--app",
        "bin/adapter.js",
        "AdapterStack",
        "--require-approval",
        "never",
      ],
      {
        cwd: __dirname,
        env: Object.assign(
          {
            SERVER_PATH: path.join(contentPath, "server-bundle"),
            STATIC_PATH: path.join(contentPath, "static"),
          },
          process.env
        ),
      }
    );
    console.log(cdkProc.output.toString());
  },
} as Adapter;
