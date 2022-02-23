import { StackProps, Construct, Stack, Fn, RemovalPolicy, Duration } from '@aws-cdk/core';
import { Function, AssetCode, Runtime } from '@aws-cdk/aws-lambda';
import { HttpApi, HttpMethod, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2';
import { Bucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { CloudFrontWebDistribution, OriginProtocolPolicy, PriceClass, CloudFrontAllowedMethods, LambdaEdgeEventType, SSLMethod } from '@aws-cdk/aws-cloudfront';
import { EdgeFunction } from '@aws-cdk/aws-cloudfront/lib/experimental';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { HostedZone, RecordTarget, ARecord } from '@aws-cdk/aws-route53';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets';

export interface AWSAdapterStackProps extends StackProps {
  FQDN: string;
  account?: string;
  region?: string;
}

export class AWSAdapterStack extends Stack {
  distribution: CloudFrontWebDistribution;
  bucket: Bucket;
  serverHandler: Function;
  httpApi: HttpApi;
  hostedZone: HostedZone;
  certificate: DnsValidatedCertificate;
  constructor(scope: Construct, id: string, props: AWSAdapterStackProps) {
    super(scope, id, props);

    const serverPath = process.env.SERVER_PATH;
    const staticPath = process.env.STATIC_PATH;
    const prerenderedPath = process.env.PRERENDERED_PATH;
    const edgePath = process.env.EDGE_PATH;
    const [_, zoneName, TLD] = props.FQDN.split('.');
    const domainName = `${zoneName}.${TLD}`;

    this.serverHandler = new Function(this, 'LambdaServerFunctionHandler', {
      code: new AssetCode(serverPath!),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_14_X,
      memorySize: 256,
      timeout: Duration.minutes(15),
    });

    this.httpApi = new HttpApi(this, 'API');
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration('LambdaServerIntegration', this.serverHandler, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_1_0,
      }),
    });

    this.bucket = new Bucket(this, 'StaticContentBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
    });

    const routerLambdaHandler = new EdgeFunction(this, 'RouterEdgeFunctionHandler', {
      code: new AssetCode(edgePath!),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_14_X,
      memorySize: 128,
      timeout: Duration.seconds(1),
    });

    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    }) as HostedZone;

    this.certificate = new DnsValidatedCertificate(this, 'DnsValidatedCertificate', {
      domainName: props.FQDN,
      hostedZone: this.hostedZone,
    });

    this.distribution = new CloudFrontWebDistribution(this, 'CloudFrontWebDistribution', {
      priceClass: PriceClass.PRICE_CLASS_100,
      enabled: true,
      viewerCertificate: {
        aliases: [props.FQDN],
        props: {
          acmCertificateArn: this.certificate.certificateArn,
          sslSupportMethod: SSLMethod.SNI,
        },
      },
      originConfigs: [
        {
          customOriginSource: {
            domainName: Fn.select(1, Fn.split('://', this.httpApi.apiEndpoint)),
            originHeaders: { 's3-host': this.bucket.bucketDomainName },
            originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              compress: true,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              forwardedValues: {
                queryString: true,
                cookies: {
                  forward: 'all',
                },
              },
              lambdaFunctionAssociations: [
                {
                  eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
                  lambdaFunction: routerLambdaHandler,
                  includeBody: true,
                },
              ],
            },
          ],
        },
      ],
    });

    new ARecord(this, 'ARecord', {
      recordName: props.FQDN,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      zone: this.hostedZone,
    });

    new BucketDeployment(this, 'StaticContentDeployment', {
      destinationBucket: this.bucket,
      sources: [Source.asset(staticPath!), Source.asset(prerenderedPath!)],
      retainOnDelete: false,
      prune: true,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
  }
}
