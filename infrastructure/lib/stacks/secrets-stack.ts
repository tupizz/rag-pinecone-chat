import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface SecretsStackProps extends cdk.StackProps {
  environment: string;
}

export interface EloquentSecrets {
  openaiApiKey: secretsmanager.ISecret;
  pineconeApiKey: secretsmanager.ISecret;
  jwtSecret: secretsmanager.ISecret;
  mongodbUrl: secretsmanager.ISecret;
}

export class SecretsStack extends cdk.Stack {
  public readonly secrets: EloquentSecrets;

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
    super(scope, id, props);

    // Create placeholder secrets in Secrets Manager
    // You'll need to manually update these with actual values after deployment

    // OpenAI API Key
    const openaiApiKey = new secretsmanager.Secret(this, 'OpenAIApiKey', {
      secretName: `eloquent/${props.environment}/openai-api-key`,
      description: 'OpenAI API key for GPT and embeddings',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'apiKey',
      },
    });

    // Pinecone API Key
    const pineconeApiKey = new secretsmanager.Secret(this, 'PineconeApiKey', {
      secretName: `eloquent/${props.environment}/pinecone-api-key`,
      description: 'Pinecone API key for vector database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'apiKey',
      },
    });

    // JWT Secret
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `eloquent/${props.environment}/jwt-secret`,
      description: 'JWT secret key for authentication',
      generateSecretString: {
        passwordLength: 32,
        excludePunctuation: true,
      },
    });

    // MongoDB Atlas Connection String
    const mongodbUrl = new secretsmanager.Secret(this, 'MongoDBUrl', {
      secretName: `eloquent/${props.environment}/mongodb-url`,
      description: 'MongoDB Atlas connection string',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'connectionString',
      },
    });

    // Store secrets reference
    this.secrets = {
      openaiApiKey,
      pineconeApiKey,
      jwtSecret,
      mongodbUrl,
    };

    // Create SSM Parameters for non-sensitive configuration
    new ssm.StringParameter(this, 'MongoDBDatabaseName', {
      parameterName: `/${props.environment}/eloquent/mongodb-db-name`,
      stringValue: `eloquent_chatbot_${props.environment}`,
      description: 'MongoDB database name',
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'PineconeEnvironment', {
      parameterName: `/${props.environment}/eloquent/pinecone-environment`,
      stringValue: 'us-east-1', // Update with your Pinecone region
      description: 'Pinecone environment/region',
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'PineconeIndexName', {
      parameterName: `/${props.environment}/eloquent/pinecone-index-name`,
      stringValue: `eloquent-faq-${props.environment}`,
      description: 'Pinecone index name',
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'OpenAIModel', {
      parameterName: `/${props.environment}/eloquent/openai-model`,
      stringValue: 'gpt-4o',
      description: 'OpenAI model name',
      tier: ssm.ParameterTier.STANDARD,
    });

    // Outputs
    new cdk.CfnOutput(this, 'OpenAISecretArn', {
      value: openaiApiKey.secretArn,
      description: 'OpenAI API Key Secret ARN',
      exportName: `${props.environment}-OpenAISecretArn`,
    });

    new cdk.CfnOutput(this, 'PineconeSecretArn', {
      value: pineconeApiKey.secretArn,
      description: 'Pinecone API Key Secret ARN',
      exportName: `${props.environment}-PineconeSecretArn`,
    });

    new cdk.CfnOutput(this, 'JwtSecretArn', {
      value: jwtSecret.secretArn,
      description: 'JWT Secret ARN',
      exportName: `${props.environment}-JwtSecretArn`,
    });

    new cdk.CfnOutput(this, 'MongoDBSecretArn', {
      value: mongodbUrl.secretArn,
      description: 'MongoDB Connection String Secret ARN',
      exportName: `${props.environment}-MongoDBSecretArn`,
    });

    // Instructions for updating secrets
    new cdk.CfnOutput(this, 'UpdateSecretsInstructions', {
      value: 'Run: aws secretsmanager update-secret --secret-id <secret-name> --secret-string \'{"apiKey":"your-actual-key"}\'',
      description: 'Command to update secrets with actual values',
    });
  }
}
