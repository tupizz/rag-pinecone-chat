import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { EloquentSecrets } from './secrets-stack';

export interface EcsStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.IVpc;
  ecrRepository: ecr.IRepository;
  secrets: EloquentSecrets;
  certificate?: acm.ICertificate;
  hostedZone?: route53.IHostedZone;
  domainName?: string;
}

export class EcsStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'EloquentCluster', {
      clusterName: `eloquent-cluster-${props.environment}`,
      vpc: props.vpc,
      containerInsights: true, // Enable Container Insights for monitoring
    });

    // Create CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'EloquentServiceLogs', {
      logGroupName: `/ecs/eloquent-backend-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK, // Adjust for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
    });

    // Create Task Execution Role (for pulling images and accessing secrets)
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant access to secrets
    props.secrets.openaiApiKey.grantRead(executionRole);
    props.secrets.pineconeApiKey.grantRead(executionRole);
    props.secrets.jwtSecret.grantRead(executionRole);
    props.secrets.mongodbUrl.grantRead(executionRole);

    // Grant access to ECR
    props.ecrRepository.grantPull(executionRole);

    // Create Task Role (for application permissions)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `eloquent-backend-${props.environment}`,
      memoryLimitMiB: 512, // 0.5 GB RAM
      cpu: 256, // 0.25 vCPU
      executionRole,
      taskRole,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Container Definition
    const container = taskDefinition.addContainer('BackendContainer', {
      containerName: 'eloquent-backend',
      image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository, 'latest'),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'backend',
        logGroup,
      }),
      environment: {
        // Non-sensitive environment variables
        ENVIRONMENT: 'production',
        LOG_LEVEL: 'INFO',
        BACKEND_HOST: '0.0.0.0',
        BACKEND_PORT: '8000',
        BACKEND_RELOAD: 'false',
        API_V1_STR: '/api',
        PROJECT_NAME: 'Eloquent AI Chatbot',

        // Configuration from Parameter Store (read via environment)
        MONGODB_DB_NAME: `eloquent_chatbot_${props.environment}`,
        PINECONE_ENVIRONMENT: 'us-east-1',
        PINECONE_INDEX_NAME: 'ai-powered-chatbot-challenge-omkb0qe',
        OPENAI_MODEL: 'gpt-5-chat-latest',
        OPENAI_EMBEDDING_MODEL: 'text-embedding-ada-002',
        OPENAI_TEMPERATURE: '0.7',
        OPENAI_MAX_TOKENS: '1000',
        PINECONE_TOP_K: '3',
        PINECONE_SIMILARITY_THRESHOLD: '0.75',
        JWT_ALGORITHM: 'HS256',
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: '10080',
        ANONYMOUS_SESSION_COOKIE_NAME: 'eloquent_session_id',
        ANONYMOUS_SESSION_MAX_AGE: '2592000',
        // CORS configuration - allow localhost for development and the custom domain
        ALLOWED_ORIGINS_STR: 'http://localhost:3000,http://localhost:3001,https://api.tadeutupinamba.com',
      },
      secrets: {
        // Sensitive values from Secrets Manager
        OPENAI_API_KEY: ecs.Secret.fromSecretsManager(props.secrets.openaiApiKey, 'apiKey'),
        PINECONE_API_KEY: ecs.Secret.fromSecretsManager(props.secrets.pineconeApiKey, 'apiKey'),
        JWT_SECRET_KEY: ecs.Secret.fromSecretsManager(props.secrets.jwtSecret),
        MONGODB_URL: ecs.Secret.fromSecretsManager(props.secrets.mongodbUrl, 'connectionString'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Port mappings
    container.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // Create Security Group for ECS Tasks
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    // Create Fargate Service
    this.service = new ecs.FargateService(this, 'Service', {
      serviceName: `eloquent-backend-${props.environment}`,
      cluster,
      taskDefinition,
      desiredCount: 1, // Start with 1 task, can scale up
      assignPublicIp: false, // Tasks in private subnets
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: {
        rollback: true, // Automatic rollback on deployment failure
      },
      enableExecuteCommand: true, // Enable ECS Exec for debugging
    });

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      loadBalancerName: `eloquent-alb-${props.environment}`,
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // ALB Security Group
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from anywhere (for now - add HTTPS later)
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow traffic from ALB to ECS tasks
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow traffic from ALB'
    );

    // Add security group to ALB
    this.loadBalancer.addSecurityGroup(albSecurityGroup);

    // Create Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: `eloquent-tg-${props.environment}`,
      vpc: props.vpc,
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // Create HTTP Listener
    // If certificate is provided, redirect HTTP to HTTPS
    // Otherwise, forward HTTP traffic to target group
    const httpListener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: props.certificate
        ? elbv2.ListenerAction.redirect({
            protocol: 'HTTPS',
            port: '443',
            permanent: true,
          })
        : elbv2.ListenerAction.forward([targetGroup]),
    });

    // Create HTTPS Listener (if certificate is provided)
    if (props.certificate) {
      // Allow HTTPS traffic
      albSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        'Allow HTTPS traffic'
      );

      this.loadBalancer.addListener('HttpsListener', {
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [props.certificate],
        defaultAction: elbv2.ListenerAction.forward([targetGroup]),
      });
    }

    // Create Route 53 A Record (if hosted zone and domain are provided)
    if (props.hostedZone && props.domainName) {
      new route53.ARecord(this, 'AliasRecord', {
        zone: props.hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.LoadBalancerTarget(this.loadBalancer)
        ),
        comment: `A record for ${props.domainName} pointing to ALB`,
      });
    }

    // Auto-scaling configuration
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // CloudWatch Alarms
    const cpuAlarm = this.service.metricCpuUtilization().createAlarm(this, 'HighCpuAlarm', {
      alarmName: `eloquent-high-cpu-${props.environment}`,
      alarmDescription: 'Alert when CPU utilization is high',
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const memoryAlarm = this.service.metricMemoryUtilization().createAlarm(this, 'HighMemoryAlarm', {
      alarmName: `eloquent-high-memory-${props.environment}`,
      alarmDescription: 'Alert when memory utilization is high',
      threshold: 90,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name',
      exportName: `${props.environment}-LoadBalancerDNS`,
    });

    new cdk.CfnOutput(this, 'ServiceUrl', {
      value: props.domainName
        ? `https://${props.domainName}`
        : `http://${this.loadBalancer.loadBalancerDnsName}`,
      description: 'Service URL',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${props.environment}-ClusterName`,
    });

    new cdk.CfnOutput(this, 'TaskDefinitionArn', {
      value: taskDefinition.taskDefinitionArn,
      description: 'Task Definition ARN',
    });
  }
}
