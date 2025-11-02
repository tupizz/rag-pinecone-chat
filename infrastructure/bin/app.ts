#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { EcrStack } from '../lib/stacks/ecr-stack';
import { SecretsStack } from '../lib/stacks/secrets-stack';
import { DnsStack } from '../lib/stacks/dns-stack';
import { EcsStack } from '../lib/stacks/ecs-stack';

const app = new cdk.App();

// Get environment and configuration from context or environment variables
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const awsAccount = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const awsRegion = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

// Stack naming prefix
const projectName = 'Eloquent';

// Environment configuration
const env = {
  account: awsAccount,
  region: awsRegion,
};

// Tags for all resources
const tags = {
  Project: projectName,
  Environment: environment,
  ManagedBy: 'CDK',
};

// 1. VPC Stack - Networking foundation
const vpcStack = new VpcStack(app, `${projectName}VpcStack`, {
  env,
  stackName: `${projectName}-VPC-${environment}`,
  description: 'VPC with public and private subnets across multiple AZs',
  tags,
  environment,
});

// 2. ECR Stack - Container registry
const ecrStack = new EcrStack(app, `${projectName}EcrStack`, {
  env,
  stackName: `${projectName}-ECR-${environment}`,
  description: 'ECR repository for backend Docker images',
  tags,
  environment,
});

// 3. Secrets Stack - Secrets Manager for API keys
const secretsStack = new SecretsStack(app, `${projectName}SecretsStack`, {
  env,
  stackName: `${projectName}-Secrets-${environment}`,
  description: 'Secrets Manager for sensitive configuration',
  tags,
  environment,
});

// 4. DNS Stack - Route 53 and ACM certificate (optional)
const domainName = process.env.DOMAIN_NAME || 'tadeutupinamba.com';
const subdomainName = process.env.SUBDOMAIN_NAME || 'api';
const enableDns = process.env.ENABLE_DNS === 'true';

let dnsStack;
if (enableDns) {
  dnsStack = new DnsStack(app, `${projectName}DnsStack`, {
    env,
    stackName: `${projectName}-DNS-${environment}`,
    description: 'Route 53 hosted zone and ACM certificate',
    tags,
    environment,
    domainName,
    subdomainName,
  });
}

// 5. ECS Stack - Fargate service with ALB
const ecsStack = new EcsStack(app, `${projectName}EcsStack`, {
  env,
  stackName: `${projectName}-ECS-${environment}`,
  description: 'ECS Fargate service with Application Load Balancer',
  tags,
  environment,
  vpc: vpcStack.vpc,
  ecrRepository: ecrStack.repository,
  secrets: secretsStack.secrets,
  certificate: dnsStack?.certificate,
  hostedZone: dnsStack?.hostedZone,
  domainName: dnsStack?.fullDomainName,
});

// Add dependencies
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(ecrStack);
ecsStack.addDependency(secretsStack);
if (dnsStack) {
  ecsStack.addDependency(dnsStack);
}

app.synth();
