#!/bin/bash
# Script to set up GitHub Actions OIDC with AWS

set -e

echo "🔐 Setting up GitHub Actions OIDC with AWS"
echo ""

# Get GitHub repository details
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter your repository name (default: eloquent-ai-chatbot): " GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-eloquent-ai-chatbot}

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "📋 Configuration:"
echo "  GitHub: $GITHUB_USER/$GITHUB_REPO"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"
echo ""

# Step 1: Create OIDC Provider (if not exists)
echo "1️⃣  Creating GitHub OIDC Provider in AWS..."
OIDC_PROVIDER_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" 2>/dev/null; then
    echo "✅ OIDC Provider already exists"
else
    aws iam create-open-id-connect-provider \
        --url "https://token.actions.githubusercontent.com" \
        --client-id-list "sts.amazonaws.com" \
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
        --tags Key=Project,Value=EloquentAI Key=ManagedBy,Value=Script
    echo "✅ OIDC Provider created"
fi

# Step 2: Create IAM Policy for deployment
echo ""
echo "2️⃣  Creating IAM Policy for GitHub Actions..."

POLICY_NAME="GitHubActionsEloquentDeployPolicy"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate",
        "cloudformation:ListStacks",
        "cloudformation:UpdateStack",
        "cloudformation:CreateStack",
        "cloudformation:DeleteStack",
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet"
      ],
      "Resource": "*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    },
    {
      "Sid": "CDKAccess",
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole"
      ],
      "Resource": "arn:aws:iam::$AWS_ACCOUNT_ID:role/cdk-*"
    }
  ]
}
EOF
)

# Check if policy exists
POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

if [ -z "$POLICY_ARN" ]; then
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "$POLICY_DOC" \
        --description "Policy for GitHub Actions to deploy Eloquent AI backend" \
        --query 'Policy.Arn' \
        --output text)
    echo "✅ Policy created: $POLICY_ARN"
else
    echo "✅ Policy already exists: $POLICY_ARN"
    # Update policy if it exists
    POLICY_VERSION=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text | head -1)
    if [ -n "$POLICY_VERSION" ]; then
        aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$POLICY_VERSION" 2>/dev/null || true
    fi
    aws iam create-policy-version --policy-arn "$POLICY_ARN" --policy-document "$POLICY_DOC" --set-as-default
    echo "✅ Policy updated to latest version"
fi

# Step 3: Create IAM Role
echo ""
echo "3️⃣  Creating IAM Role for GitHub Actions..."

ROLE_NAME="GitHubActionsEloquentDeployRole"
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_USER/$GITHUB_REPO:*"
        }
      }
    }
  ]
}
EOF
)

if aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null; then
    echo "✅ Role already exists"
    # Update trust policy
    aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST_POLICY"
    echo "✅ Trust policy updated"
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY" \
        --description "Role for GitHub Actions to deploy Eloquent AI backend" \
        --tags Key=Project,Value=EloquentAI Key=ManagedBy,Value=Script
    echo "✅ Role created"
fi

# Attach policy to role
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN"
echo "✅ Policy attached to role"

ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"

# Step 4: Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Add this secret to your GitHub repository:"
echo "   Go to: https://github.com/$GITHUB_USER/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "   Secret name:  AWS_ROLE_ARN"
echo "   Secret value: $ROLE_ARN"
echo ""
echo "2. Test the workflow:"
echo "   git add ."
echo "   git commit -m \"test: trigger deployment\""
echo "   git push origin main"
echo ""
echo "=========================================="
echo ""
echo "Role ARN to copy:"
echo "$ROLE_ARN"
echo ""
