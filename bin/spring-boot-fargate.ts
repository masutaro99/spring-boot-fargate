#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SpringBootFargateStack } from "../lib/spring-boot-fargate-stack";
import { EcrRepositoryStack } from "../lib/ecr-repository-stack";

const app = new cdk.App();
new EcrRepositoryStack(app, "EcrRepositoryStack", {
  repositoryName: "spring-boot-sample-app",
});
new SpringBootFargateStack(app, "SpringBootFargateStack", {
  repositoryName: "spring-boot-sample-app",
  imageTag: "v2",
});
