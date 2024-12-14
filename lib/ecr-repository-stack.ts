import * as cdk from "aws-cdk-lib";
import { aws_ecr as ecr } from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface EcrConstructProps extends cdk.StackProps {
  repositoryName: string;
}

export class EcrRepositoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcrConstructProps) {
    super(scope, id);

    // ECR Repository
    new ecr.Repository(this, "AppRepository", {
      repositoryName: props.repositoryName,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
    });
  }
}
