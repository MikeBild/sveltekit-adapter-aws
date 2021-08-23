import { readdirSync, statSync } from "fs";
import { join } from "path";
import { StackProps, Construct, Stack, Fn } from "@aws-cdk/core";
import { Function, AssetCode, Runtime } from "@aws-cdk/aws-lambda";
import {
  HttpApi,
  HttpMethod,
  PayloadFormatVersion,
} from "@aws-cdk/aws-apigatewayv2";
import { Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import {
  OriginAccessIdentity,
  CloudFrontWebDistribution,
  OriginProtocolPolicy,
  PriceClass,
  CloudFrontAllowedMethods,
  Behavior,
} from "@aws-cdk/aws-cloudfront";

interface AdapterProps extends StackProps {
  serverPath: string;
  staticPath: string;
}

export class AdapterStack extends Stack {
  constructor(scope: Construct, id: string, props: AdapterProps) {
    super(scope, id, props);

    const { serverPath, staticPath } = props;

    const handler = new Function(this, "LambdaFunctionHandler", {
      code: new AssetCode(serverPath),
      handler: "index.handler",
      runtime: Runtime.NODEJS_14_X,
      memorySize: 256,
    });

    const api = new HttpApi(this, "API");
    api.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.ANY],
      integration: new LambdaProxyIntegration({
        handler,
        payloadFormatVersion: PayloadFormatVersion.VERSION_1_0,
      }),
    });

    const staticBucket = new Bucket(this, "StaticContentBucket");
    const staticDeployment = new BucketDeployment(
      this,
      "StaticContentDeployment",
      {
        destinationBucket: staticBucket,
        sources: [Source.asset(staticPath)],
        retainOnDelete: false,
        prune: true,
      }
    );

    const staticID = new OriginAccessIdentity(this, "OriginAccessIdentity");
    staticBucket.grantRead(staticID);

    const distro = new CloudFrontWebDistribution(
      this,
      "CloudFrontWebDistribution",
      {
        priceClass: PriceClass.PRICE_CLASS_100,
        defaultRootObject: "",
        originConfigs: [
          {
            customOriginSource: {
              domainName: Fn.select(1, Fn.split("://", api.apiEndpoint)),
              originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
            },
            behaviors: [
              {
                allowedMethods: CloudFrontAllowedMethods.ALL,
                forwardedValues: {
                  queryString: false,
                  cookies: {
                    forward: "whitelist",
                    whitelistedNames: ["sid", "sid.sig"],
                  },
                },
                isDefaultBehavior: true,
              },
            ],
          },
          {
            s3OriginSource: {
              s3BucketSource: staticBucket,
              originAccessIdentity: staticID,
            },
            behaviors: mkStaticRoutes(props.staticPath),
          },
        ],
      }
    );
  }
}

function mkStaticRoutes(staticPath: string): Behavior[] {
  return readdirSync(staticPath).map((f) => {
    const fullPath = join(staticPath, f);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return {
        pathPattern: `/${f}/*`,
      };
    }
    return { pathPattern: `/${f}` };
  });
}
