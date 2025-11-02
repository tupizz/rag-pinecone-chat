import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export interface EcrStackProps extends cdk.StackProps {
  environment: string;
}

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    // Create ECR repository for backend container images
    this.repository = new ecr.Repository(this, 'EloquentBackendRepo', {
      repositoryName: `eloquent-backend-${props.environment}`,

      // Image scanning for security vulnerabilities
      imageScanOnPush: true,

      // Lifecycle policy to clean up old images
      lifecycleRules: [
        {
          description: 'Delete untagged images after 7 days',
          maxImageAge: cdk.Duration.days(7),
          rulePriority: 1,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
        {
          description: 'Keep last 10 images (applies to all)',
          maxImageCount: 10,
          rulePriority: 2,
          // tagStatus defaults to ANY, which must have highest priority
        },
      ],

      // Encryption at rest (AES-256)
      encryption: ecr.RepositoryEncryption.AES_256,

      // Removal policy - be careful in production
      removalPolicy: props.environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN  // Keep repository in production
        : cdk.RemovalPolicy.DESTROY, // Auto-delete in dev/staging

      // Auto-delete images if repository is destroyed (only for non-prod)
      autoDeleteImages: props.environment !== 'prod',
    });

    // Grant pull access to ECS task execution role (will be created in ECS stack)
    // This is handled automatically when ECS task definition references the repository

    // Outputs
    new cdk.CfnOutput(this, 'RepositoryName', {
      value: this.repository.repositoryName,
      description: 'ECR Repository Name',
      exportName: `${props.environment}-EcrRepositoryName`,
    });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `${props.environment}-EcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'ECR Repository ARN',
    });
  }
}
