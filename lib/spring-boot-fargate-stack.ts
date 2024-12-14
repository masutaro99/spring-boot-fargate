import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";

export class SpringBootFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
      containerInsights: true,
    });
    const cfnCluster = cluster.node.defaultChild as ecs.CfnCluster;
    cfnCluster.addPropertyOverride("ClusterSettings", [
      {
        name: "containerInsights",
        value: "enhanced",
      },
    ]);
  }
}
