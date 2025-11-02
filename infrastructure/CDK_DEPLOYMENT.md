# CDK-Only Deployment Guide for Eloquent AI Backend

This guide explains how to deploy the complete infrastructure using **AWS CDK only**.

## 🎯 What CDK Will Deploy

When you run `cdk deploy --all`, CDK will create 4 CloudFormation stacks in this order:

```
1. EloquentVpcStack
   └─ VPC with public/private subnets in 2 AZs
   └─ NAT Gateway for private subnet internet access
   └─ Internet Gateway for public subnet access
   └─ VPC Flow Logs to CloudWatch

2. EloquentEcrStack
   └─ ECR Repository for Docker images
   └─ Lifecycle policy (keep last 10 images)
   └─ Image scanning enabled

3. EloquentSecretsStack
   └─ 4 Secrets in Secrets Manager (with placeholders):
      • eloquent/{env}/openai-api-key
      • eloquent/{env}/pinecone-api-key
      • eloquent/{env}/jwt-secret (auto-generated)
      • eloquent/{env}/mongodb-url
   └─ 4 Parameters in Parameter Store:
      • MongoDB database name
      • Pinecone environment/index name
      • OpenAI model name

4. EloquentEcsStack (depends on all above)
   └─ ECS Fargate Cluster
   └─ Task Definition (CPU: 256, Memory: 512)
   └─ Fargate Service (desired: 1, max: 4)
   └─ Application Load Balancer (ALB)
   └─ Target Group with health checks
   └─ Security Groups (ALB + ECS tasks)
   └─ Auto-scaling policies (CPU/Memory based)
   └─ CloudWatch Log Group
   └─ CloudWatch Alarms (High CPU/Memory)
```

## 📋 Prerequisites

### 1. Required Software

```bash
# Check versions
node --version      # >= 18.x
npm --version       # >= 9.x
aws --version       # >= 2.x
cdk --version       # >= 2.120.0
docker --version    # >= 20.x

# Install CDK CLI if needed
npm install -g aws-cdk
```

### 2. AWS Configuration

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output (json)

# Verify authentication
aws sts get-caller-identity
# Should show your Account ID, ARN, and UserId
```

### 3. Environment Variables

```bash
# Set these before deployment
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
export ENVIRONMENT=dev  # or prod, staging, etc.
```

## 🚀 Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd infrastructure
npm install
```

This installs:
- `aws-cdk-lib` - CDK framework
- `constructs` - CDK constructs
- TypeScript and type definitions

### Step 2: Build TypeScript

```bash
npm run build
```

This compiles `*.ts` files to `*.js` and validates TypeScript syntax.

### Step 3: Bootstrap CDK (First Time Only)

```bash
cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

This creates:
- S3 bucket for CDK assets
- IAM roles for CloudFormation
- ECR repository for Docker images (if using asset bundling)

**You only need to do this once per account/region.**

### Step 4: Review Changes

```bash
# See what will be created
cdk synth

# See differences from current state
cdk diff
```

**Important**: Review the output! It shows:
- Resources to be created
- IAM policies
- Security group rules
- Cost estimates (if configured)

### Step 5: Deploy All Stacks

```bash
cdk deploy --all --require-approval never
```

**What happens:**
1. CDK synthesizes CloudFormation templates
2. Uploads templates to S3
3. Deploys stacks in dependency order:
   - VPC Stack (~3-5 minutes)
   - ECR Stack (~1 minute)
   - Secrets Stack (~1 minute)
   - ECS Stack (~5-8 minutes)

**Total time: ~10-15 minutes**

### Alternative: Deploy Individual Stacks

```bash
# Deploy one at a time
npm run deploy:vpc
npm run deploy:ecr
npm run deploy:secrets
npm run deploy:ecs
```

### Step 6: Capture Outputs

After deployment, CDK will display important outputs:

```bash
Outputs:
EloquentVpcStack.VpcId = vpc-0123456789abcdef
EloquentVpcStack.AvailabilityZones = us-east-1a,us-east-1b
EloquentEcrStack.RepositoryUri = 123456789012.dkr.ecr.us-east-1.amazonaws.com/eloquent-backend-dev
EloquentSecretsStack.OpenAISecretArn = arn:aws:secretsmanager:us-east-1:123456789012:secret:eloquent/dev/openai-api-key-AbCdEf
EloquentEcsStack.LoadBalancerDNS = eloquent-alb-dev-123456789.us-east-1.elb.amazonaws.com
EloquentEcsStack.ServiceUrl = http://eloquent-alb-dev-123456789.us-east-1.elb.amazonaws.com
```

**Save these values!** You'll need them for the next steps.

## ✅ Post-Deployment Steps

The infrastructure is now deployed, but you need to:

### Step 1: Update Secrets with Real Values

The secrets were created with placeholder values. Update them:

```bash
# OpenAI API Key
aws secretsmanager update-secret \
  --secret-id eloquent/dev/openai-api-key \
  --secret-string '{"apiKey":"sk-proj-YOUR-REAL-KEY-HERE"}'

# Pinecone API Key
aws secretsmanager update-secret \
  --secret-id eloquent/dev/pinecone-api-key \
  --secret-string '{"apiKey":"pcsk_YOUR-REAL-KEY-HERE"}'

# MongoDB Connection String
aws secretsmanager update-secret \
  --secret-id eloquent/dev/mongodb-url \
  --secret-string '{"connectionString":"mongodb+srv://user:pass@cluster.mongodb.net/"}'

# JWT Secret is auto-generated, but you can update if needed
aws secretsmanager update-secret \
  --secret-id eloquent/dev/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"
```

### Step 2: Build and Push Docker Image

```bash
# Get ECR repository URI (from CDK outputs)
ECR_REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name "Eloquent-ECR-dev" \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text)

echo "ECR Repository: $ECR_REPO_URI"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO_URI

# Build Docker image (from project root)
cd ..
docker build \
  --target production \
  --tag $ECR_REPO_URI:latest \
  --file backend/Dockerfile \
  --platform linux/amd64 \
  .

# Push to ECR
docker push $ECR_REPO_URI:latest
```

### Step 3: Deploy Application to ECS

```bash
# Force new deployment to pull the Docker image
aws ecs update-service \
  --cluster eloquent-cluster-dev \
  --service eloquent-backend-dev \
  --force-new-deployment

# Wait for service to stabilize (~2-3 minutes)
aws ecs wait services-stable \
  --cluster eloquent-cluster-dev \
  --services eloquent-backend-dev
```

### Step 4: Verify Deployment

```bash
# Get Load Balancer DNS
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
  --stack-name "Eloquent-ECS-dev" \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Test health endpoint
curl http://$LOAD_BALANCER_DNS/health

# Expected response:
# {"status":"healthy","timestamp":"2025-11-01T..."}

# Test readiness check (with dependencies)
curl http://$LOAD_BALANCER_DNS/health/ready

# Test API documentation
open http://$LOAD_BALANCER_DNS/docs
```

## 🔍 Understanding the Stack Dependencies

```mermaid
graph TD
    A[VPC Stack] --> D[ECS Stack]
    B[ECR Stack] --> D
    C[Secrets Stack] --> D
    D --> E[Running Application]
```

**Why this order?**
1. **VPC first**: ECS needs networking
2. **ECR + Secrets**: Independent, can be parallel
3. **ECS last**: Needs VPC, ECR repository URI, and Secrets ARNs

## 🔧 CDK Configuration Options

### Change Environment

```bash
# For production
export ENVIRONMENT=prod
cdk deploy --all

# This creates:
# - Eloquent-VPC-prod
# - Eloquent-ECR-prod
# - Eloquent-Secrets-prod
# - Eloquent-ECS-prod
```

### Change Resource Sizing

Edit `infrastructure/lib/stacks/ecs-stack.ts`:

```typescript
// Current: 256 CPU, 512 Memory
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
  memoryLimitMiB: 1024,  // Change to 1 GB
  cpu: 512,              // Change to 0.5 vCPU
  // ...
});

// Current: 1-4 tasks
const scaling = this.service.autoScaleTaskCount({
  minCapacity: 2,  // Increase minimum
  maxCapacity: 10, // Increase maximum
});
```

Then redeploy:
```bash
npm run build
cdk deploy EloquentEcsStack
```

### Add Custom Domain (Future)

In `ecs-stack.ts`, add HTTPS listener:

```typescript
// Request ACM certificate first
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'Certificate',
  'arn:aws:acm:...'
);

// Add HTTPS listener
const httpsListener = this.loadBalancer.addListener('HttpsListener', {
  port: 443,
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificates: [certificate],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
});
```

## 🧹 Cleanup / Destroy

To delete all resources:

```bash
cd infrastructure
cdk destroy --all
```

**⚠️ Warning:**
- This deletes everything
- ECR repository will be emptied first (if configured)
- Logs will be deleted (change `RemovalPolicy` to `RETAIN` to keep)
- NAT Gateway stops incurring charges immediately

**Cost of running resources:**
- VPC NAT Gateway: ~$1/day
- ECS Fargate: ~$0.40-1.60/day (1-4 tasks)
- ALB: ~$0.60/day
- **Total: ~$2-3/day when running**

## 📊 Monitoring Deployed Resources

### View CloudWatch Logs

```bash
# Stream logs
aws logs tail /ecs/eloquent-backend-dev --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/eloquent-backend-dev \
  --filter-pattern "ERROR"
```

### Check ECS Service Status

```bash
# Service details
aws ecs describe-services \
  --cluster eloquent-cluster-dev \
  --services eloquent-backend-dev

# Running tasks
aws ecs list-tasks \
  --cluster eloquent-cluster-dev \
  --service-name eloquent-backend-dev
```

### Check ALB Health

```bash
# Target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names eloquent-tg-dev \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

## ❓ Troubleshooting

### Issue: "Stack already exists"

**Solution**: Stack exists from previous deployment
```bash
# Check current stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Delete if needed
cdk destroy EloquentEcsStack
```

### Issue: "CDK bootstrap required"

**Solution**: Run bootstrap command
```bash
cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

### Issue: "Docker image not found"

**Cause**: No image pushed to ECR yet

**Solution**: ECS will show "Waiting for image". Push image first, then force new deployment:
```bash
./scripts/build-and-push.sh  # Build and push image
aws ecs update-service --cluster eloquent-cluster-dev --service eloquent-backend-dev --force-new-deployment
```

### Issue: "Tasks failing health checks"

**Diagnosis**:
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster eloquent-cluster-dev \
  --tasks $(aws ecs list-tasks --cluster eloquent-cluster-dev --query 'taskArns[0]' --output text)

# Check CloudWatch logs
aws logs tail /ecs/eloquent-backend-dev --follow
```

**Common causes**:
1. Secrets not updated with real values
2. MongoDB connection string invalid
3. OpenAI or Pinecone API keys invalid

## 🎉 Success Checklist

After deployment, verify:
- [ ] All 4 CloudFormation stacks show `CREATE_COMPLETE`
- [ ] ECR repository exists and has an image
- [ ] Secrets are updated with real values
- [ ] ECS service has 1 running task
- [ ] ALB health check passes
- [ ] `/health` endpoint returns 200
- [ ] `/docs` shows API documentation
- [ ] Can send chat message successfully

## 📚 Additional Resources

- **CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **CloudFormation Console**: Check stack events and outputs
- **ECS Console**: Monitor tasks and service health
- **CloudWatch Console**: View logs and metrics

---

**Questions?** Check the main [README](./README.md) or create an issue.
