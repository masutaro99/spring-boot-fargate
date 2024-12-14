#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SpringBootFargateStack } from "../lib/spring-boot-fargate-stack";

const app = new cdk.App();
new SpringBootFargateStack(app, "SpringBootFargateStack", {});
