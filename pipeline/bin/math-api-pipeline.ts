#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MathApiPipelineStack } from '../lib/math-api-pipeline-stack';

const app = new cdk.App();
new MathApiPipelineStack(app, 'MathApiPipelineStack', {  
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } 
});