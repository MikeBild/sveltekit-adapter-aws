import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as gw from "@aws-cdk/aws-apigatewayv2";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3depl from "@aws-cdk/aws-s3-deployment";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import * as cdn from "@aws-cdk/aws-cloudfront";
import * as fs from "fs";
import * as path from "path";

interface AdapterProps extends cdk.StackProps {
  serverPath: string;
  staticPath: string;
}

export class AdapterStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AdapterProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, "handler", {
      code: new lambda.AssetCode(props?.serverPath),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    const api = new gw.HttpApi(this, "api");
    api.addRoutes({
      path: "/{proxy+}",
      methods: [gw.HttpMethod.ANY],
      integration: new LambdaProxyIntegration({
        handler,
        payloadFormatVersion: gw.PayloadFormatVersion.VERSION_1_0,
      }),
    });

    const staticBucket = new s3.Bucket(this, "staticBucket");
    const staticDeployment = new s3depl.BucketDeployment(
      this,
      "staticDeployment",
      {
        destinationBucket: staticBucket,
        sources: [s3depl.Source.asset(props.staticPath)],
      }
    );

    const staticID = new cdn.OriginAccessIdentity(this, "staticID");
    staticBucket.grantRead(staticID);

    const distro = new cdn.CloudFrontWebDistribution(this, "distro", {
      priceClass: cdn.PriceClass.PRICE_CLASS_100,
      defaultRootObject: "",
      originConfigs: [
        {
          customOriginSource: {
            domainName: cdk.Fn.select(1, cdk.Fn.split("://", api.apiEndpoint)),
            originProtocolPolicy: cdn.OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [
            {
              allowedMethods: cdn.CloudFrontAllowedMethods.ALL,
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
    });
  }
}

function mkStaticRoutes(staticPath: string): cdn.Behavior[] {
  return fs.readdirSync(staticPath).map((f) => {
    const fullPath = path.join(staticPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return {
        pathPattern: `/${f}/*`,
      };
    }
    return { pathPattern: `/${f}` };
  });
}
