import type { AWS } from "@serverless/typescript";

import fetchImage from "@functions/fetchImage";

const BUCKET = "top100-lambda-images";

const serverlessConfiguration: AWS = {
  service: "top100-sls",
  frameworkVersion: "2",
  plugins: ["serverless-esbuild"],
  layers: {
    basic: {
      path: "layer_basic",
      name: "basic",
      compatibleRuntimes: ["nodejs14.x"],
    },
  },
  provider: {
    name: "aws",
    region: "eu-west-1",
    runtime: "nodejs14.x",
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:PutObjectAcl"],
        Resource: `arn:aws:s3:::${BUCKET}/*`,
      },
    ],
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
    lambdaHashingVersion: "20201221",
  },
  // import the function via paths
  functions: { fetchImage },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
      // external: ["sharp"],
    },
  },
};

module.exports = serverlessConfiguration;
