import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcStackProps extends cdk.StackProps {
  environment: string;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets across 2 AZs
    this.vpc = new ec2.Vpc(this, 'EloquentVpc', {
      vpcName: `eloquent-vpc-${props.environment}`,
      maxAzs: 2, // Use 2 availability zones for high availability
      natGateways: 1, // 1 NAT Gateway to save costs (use 2+ for production HA)

      // IP address allocation
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),

      // Subnet configuration
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24, // /24 = 256 IPs per subnet
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],

      // Enable DNS
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs for security monitoring (optional but recommended)
    const logGroup = new cdk.aws_logs.LogGroup(this, 'VpcFlowLogsGroup', {
      logGroupName: `/aws/vpc/eloquent-${props.environment}`,
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK, // Adjust for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
    });

    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
      trafficType: ec2.FlowLogTrafficType.REJECT, // Log only rejected traffic to save costs
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${props.environment}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
    });

    new cdk.CfnOutput(this, 'PublicSubnets', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public Subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateSubnets', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private Subnet IDs',
    });

    new cdk.CfnOutput(this, 'AvailabilityZones', {
      value: this.vpc.availabilityZones.join(','),
      description: 'Availability Zones',
    });
  }
}
