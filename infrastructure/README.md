# Eloquent AI Chatbot - AWS CDK Infrastructure

This directory contains AWS CDK (Cloud Development Kit) infrastructure code for deploying the Eloquent AI Chatbot backend to AWS using TypeScript.

## Architecture

The infrastructure consists of 4 main stacks:

1. **VPC Stack** - Networking foundation with public and private subnets across 2 AZs
2. **ECR Stack** - Container registry for Docker images
3. **Secrets Stack** - AWS Secrets Manager for sensitive credentials
4. **ECS Stack** - Fargate service with Application Load Balancer

## Prerequisites

### Required Software

```bash
# Node.js 18+ and npm
node --version  # Should be >= 18.x
npm --version

# AWS CLI v2
aws --version  # Should be >= 2.x

# AWS CDK CLI
npm install -g aws-cdk
cdk --version  # Should be >= 2.120.0
```

### AWS Account Setup

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS Credentials**: Configure AWS CLI with your credentials

```bash
# Option 1: Using AWS CLI configure
aws configure

# Option 2: Using environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

3. **Bootstrap CDK** (one-time setup per region):

```bash
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

## Installation

Install dependencies:

```bash
cd infrastructure
npm install
```

## Project Structure

```
infrastructure/
├── bin/
│   └── app.ts                 # CDK app entry point
├── lib/
│   └── stacks/
│       ├── vpc-stack.ts       # VPC and networking
│       ├── ecr-stack.ts       # Container registry
│       ├── secrets-stack.ts   # Secrets management
│       └── ecs-stack.ts       # ECS Fargate + ALB
├── cdk.json                   # CDK configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

## Deployment

### Step 1: Set Environment Variables

```bash
# Set your AWS account and region
export CDK_DEFAULT_ACCOUNT=123456789012  # Your AWS account ID
export CDK_DEFAULT_REGION=us-east-1      # Your preferred region
export ENVIRONMENT=dev                    # Environment name (dev, staging, prod)
```

### Step 2: Review and Synthesize

Review what will be deployed:

```bash
npm run synth
```

Check the differences:

```bash
npm run diff
```

### Step 3: Deploy All Stacks

Deploy all stacks at once:

```bash
npm run deploy
```

Or deploy individually:

```bash
# Deploy in order (dependencies)
npm run deploy:vpc
npm run deploy:ecr
npm run deploy:secrets
npm run deploy:ecs
```

### Step 4: Update Secrets

After deployment, update the placeholder secrets with actual values:

```bash
# Get secret ARNs from CDK outputs
aws secretsmanager list-secrets

# Update OpenAI API Key
aws secretsmanager update-secret \
  --secret-id eloquent/dev/openai-api-key \
  --secret-string '{"apiKey":"sk-proj-your-actual-openai-key"}'

# Update Pinecone API Key
aws secretsmanager update-secret \
  --secret-id eloquent/dev/pinecone-api-key \
  --secret-string '{"apiKey":"pcsk_your-actual-pinecone-key"}'

# Update MongoDB Connection String
aws secretsmanager update-secret \
  --secret-id eloquent/dev/mongodb-url \
  --secret-string '{"connectionString":"mongodb+srv://user:pass@cluster.mongodb.net/"}'

# JWT Secret is auto-generated, but you can update it if needed
```

### Step 5: Build and Push Docker Image

```bash
# Navigate to project root
cd ..

# Get ECR repository URI from CDK outputs
export ECR_REPO=$(aws cloudformation describe-stacks \
  --stack-name Eloquent-ECR-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO

# Build Docker image
docker build -t eloquent-backend:latest \
  --target production \
  -f backend/Dockerfile .

# Tag image for ECR
docker tag eloquent-backend:latest $ECR_REPO:latest

# Push to ECR
docker push $ECR_REPO:latest
```

### Step 6: Update ECS Service

After pushing the image, update the ECS service:

```bash
# Force new deployment to pull latest image
aws ecs update-service \
  --cluster eloquent-cluster-dev \
  --service eloquent-backend-dev \
  --force-new-deployment
```

### Step 7: Test the Deployment

```bash
# Get the Load Balancer DNS from CDK outputs
export LB_DNS=$(aws cloudformation describe-stacks \
  --stack-name Eloquent-ECS-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Test health endpoint
curl http://$LB_DNS/health

# Test API
curl http://$LB_DNS/api/health/ready
```

## Configuration

### Environment Variables

The ECS task uses the following environment variables:

**From Secrets Manager (sensitive):**
- `OPENAI_API_KEY` - OpenAI API key
- `PINECONE_API_KEY` - Pinecone API key
- `JWT_SECRET_KEY` - JWT signing secret
- `MONGODB_URL` - MongoDB Atlas connection string

**From Environment (non-sensitive):**
- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `MONGODB_DB_NAME=eloquent_chatbot_dev`
- `PINECONE_INDEX_NAME=eloquent-faq-dev`
- See `ecs-stack.ts` for complete list

### Scaling Configuration

**Auto-scaling settings in ECS Stack:**
- Min tasks: 1
- Max tasks: 4
- CPU target: 70%
- Memory target: 80%

Adjust in `lib/stacks/ecs-stack.ts`:

```typescript
const scaling = this.service.autoScaleTaskCount({
  minCapacity: 2,  // Increase for production
  maxCapacity: 10, // Increase for production
});
```

### Resource Sizing

**Current task definition:**
- CPU: 256 (0.25 vCPU)
- Memory: 512 MB

For production, increase in `lib/stacks/ecs-stack.ts`:

```typescript
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
  memoryLimitMiB: 1024, // 1 GB
  cpu: 512,             // 0.5 vCPU
  // ...
});
```

## Monitoring and Logs

### CloudWatch Logs

View logs in CloudWatch:

```bash
# Stream logs
aws logs tail /ecs/eloquent-backend-dev --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/eloquent-backend-dev \
  --filter-pattern "ERROR"
```

### CloudWatch Alarms

Two alarms are created automatically:
- High CPU (> 80%)
- High Memory (> 90%)

Configure SNS notifications in `ecs-stack.ts` to receive alerts.

### Container Insights

Enabled by default for detailed metrics:
- Go to CloudWatch Console → Container Insights
- Select your cluster for detailed metrics

## Troubleshooting

### ECS Tasks Not Starting

```bash
# Check service events
aws ecs describe-services \
  --cluster eloquent-cluster-dev \
  --services eloquent-backend-dev

# Check task failures
aws ecs describe-tasks \
  --cluster eloquent-cluster-dev \
  --tasks $(aws ecs list-tasks --cluster eloquent-cluster-dev --service-name eloquent-backend-dev --query 'taskArns[0]' --output text)
```

### Health Check Failures

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names eloquent-tg-dev \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

### Secrets Access Issues

```bash
# Verify secrets exist
aws secretsmanager list-secrets --query 'SecretList[?Name==`eloquent/dev/openai-api-key`]'

# Check task execution role permissions
aws iam get-role --role-name Eloquent-ECS-dev-TaskExecutionRole
```

## Cost Optimization

### Estimated Monthly Costs (us-east-1)

- **VPC**:
  - NAT Gateway: ~$32/month
  - VPC Flow Logs: ~$1-5/month

- **ECS Fargate**:
  - 1 task (0.25 vCPU, 512 MB): ~$12/month
  - 4 tasks (auto-scaled): ~$48/month

- **ALB**: ~$18/month + $0.008/LCU-hour

- **ECR**: $0.10/GB-month storage

- **Secrets Manager**: $0.40/secret/month = ~$1.60/month

**Total estimated: $65-100/month for basic setup**

### Cost Savings Tips

1. **Use fewer NAT Gateways**: Currently using 1 (cheaper but less HA)
2. **Right-size tasks**: Start with smaller tasks, scale up if needed
3. **Use Spot for dev/staging**: Consider Fargate Spot pricing
4. **Enable S3 VPC Endpoint**: Free data transfer within VPC
5. **Schedule auto-scaling**: Scale down during off-hours

## Security Best Practices

✅ **Implemented:**
- Private subnets for ECS tasks
- Secrets Manager for sensitive data
- Security groups with minimal access
- Container image scanning enabled
- VPC Flow Logs for network monitoring
- IAM roles with least privilege
- Encryption at rest for ECR and Secrets

⚠️ **TODO for Production:**
- [ ] Add HTTPS/TLS on ALB with ACM certificate
- [ ] Configure WAF rules
- [ ] Enable GuardDuty
- [ ] Set up AWS Config rules
- [ ] Configure CloudTrail
- [ ] Add DDoS protection (Shield)

## Cleanup

To delete all resources:

```bash
# Delete all stacks
npm run destroy

# Confirm deletion for each stack
```

**⚠️ Warning**: This will delete all resources including data in logs.

## Next Steps

1. **Set up CI/CD**: See `../.github/workflows/` for GitHub Actions
2. **Add HTTPS**: Request ACM certificate and add HTTPS listener
3. **Custom Domain**: Add Route 53 hosted zone and alias records
4. **MongoDB Atlas**: Follow `../docs/MONGODB_ATLAS_SETUP.md`
5. **Monitoring**: Set up SNS notifications for CloudWatch alarms

## Support

For issues or questions:
- Check CloudWatch Logs for application errors
- Review ECS service events
- Check AWS CDK documentation: https://docs.aws.amazon.com/cdk/
- Review stack code in `lib/stacks/`

## License

See main project LICENSE file.
