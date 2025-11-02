import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
  environment: string;
  domainName: string;
  subdomainName: string;
}

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;
  public readonly fullDomainName: string;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.fullDomainName = `${props.subdomainName}.${props.domainName}`;

    // Create hosted zone for the subdomain
    // You'll need to add NS records in GoDaddy pointing to this hosted zone
    this.hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: this.fullDomainName,
      comment: `Hosted zone for Eloquent AI Chatbot API (${props.environment})`,
    });

    // Request ACM certificate for the subdomain
    // This will create DNS validation records automatically in the hosted zone
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: this.fullDomainName,
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // Outputs
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route 53 Hosted Zone ID',
      exportName: `${props.environment}-HostedZoneId`,
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', this.hostedZone.hostedZoneNameServers || []),
      description: 'Name servers to configure in GoDaddy',
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: this.fullDomainName,
      description: 'Full domain name for the API',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
      exportName: `${props.environment}-CertificateArn`,
    });

    new cdk.CfnOutput(this, 'GoDaddyInstructions', {
      value: `Add NS record in GoDaddy: Subdomain="${props.subdomainName}", Type=NS, Value=[Use nameservers above]`,
      description: 'Instructions for GoDaddy DNS configuration',
    });
  }
}
