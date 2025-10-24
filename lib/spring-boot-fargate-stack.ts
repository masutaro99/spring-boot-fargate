import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface SpringBootFargateStackProps extends cdk.StackProps {
  repositoryName: string;
  imageTag: string;
}

export class SpringBootFargateStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: SpringBootFargateStackProps
  ) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 18,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Secret for DB credentials
    const dbSecret = new secretsmanager.Secret(this, "AuroraSecret", {
      secretName: `aurora-root-secret`,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
        secretStringTemplate: JSON.stringify({
          username: "postgres",
        }),
      },
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
      containerInsightsV2: ecs.ContainerInsights.ENHANCED,
    });

    // ECS Task Execution Role
    const taskExecutionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    // ECS Task Role
    const taskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
    });

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        memoryLimitMiB: 1024,
        cpu: 512,
        taskRole: taskRole,
        executionRole: taskExecutionRole,
      }
    );
    const ecsContainer = taskDefinition.addContainer("App", {
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(
          this,
          "AppRepository",
          props.repositoryName
        ),
        props.imageTag
      ),
      cpu: 384,
      memoryLimitMiB: 768,
      essential: true,
      environment: {
        JAVA_TOOL_OPTIONS: "-javaagent:/aws-opentelemetry-agent.jar",
        OTEL_TRACES_SAMPLER: "xray",
        OTEL_TRACES_EXPORTER: "otlp",
        OTEL_METRICS_EXPORTER: "none",
        OTEL_PROPAGATORS: "xray,tracecontext,baggage,b3",
        OTEL_RESOURCE_ATTRIBUTES:
          "service.name=spring-boot-sample-app,aws.log.group.names=spring-boot-sample-app",
        OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://127.0.0.1:4316/v1/traces",
        OTEL_AWS_APPLICATION_SIGNALS_EXPORTER_ENDPOINT:
          "http://127.0.0.1:4316/v1/metrics",
        OTEL_AWS_APPLICATION_SIGNALS_ENABLED: "true",
      },
      secrets: {
        DATABASE_USER: ecs.Secret.fromSecretsManager(dbSecret, "username"),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, "password"),
        DATABASE_HOST: ecs.Secret.fromSecretsManager(dbSecret, "host"),
        DATABASE_NAME: ecs.Secret.fromSecretsManager(dbSecret, "dbname"),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, "AppLogGroup", {
          logGroupName: "/ecs/spring-boot-sample-app",
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
    });
    ecsContainer.addPortMappings({
      containerPort: 8080,
    });

    // Add CloudWatch Agent Container
    taskDefinition.addContainer("CwAgent", {
      image: ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest-amd64"
      ),
      cpu: 128,
      memoryLimitMiB: 256,
      essential: false,
      secrets: {
        CW_CONFIG_CONTENT: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromStringParameterName(
            this,
            "CWConfigParameter",
            "ecs-cwagent"
          )
        ),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ecs",
        logGroup: new cdk.aws_logs.LogGroup(this, "LogGroup", {
          logGroupName: "/ecs/cloud-watch-agent",
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
    });

    // Security Group for App
    const appSg = new ec2.SecurityGroup(this, "AppSg", {
      vpc: vpc,
      allowAllOutbound: true,
    });

    // ECS Service
    const service = new ecs.FargateService(this, "Service", {
      cluster: cluster,
      taskDefinition: taskDefinition,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      desiredCount: 1,
      assignPublicIp: false,
      securityGroups: [appSg],
      vpcSubnets: vpc.selectSubnets({
        subnetGroupName: "Private",
      }),
      healthCheckGracePeriod: cdk.Duration.seconds(240),
    });

    //Security Group of ALB
    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: vpc.selectSubnets({
        subnetGroupName: "Public",
      }),
    });

    // ALB Listener
    const albListener = alb.addListener("AlbListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // ALB Target Group
    const appTargetGroup = albListener.addTargets("AppTargetGroup", {
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      deregistrationDelay: cdk.Duration.seconds(90),
    });
    appTargetGroup.configureHealthCheck({
      path: "/",
      enabled: true,
      healthyHttpCodes: "200",
      unhealthyThresholdCount: 5,
      healthyThresholdCount: 2,
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
    });

    // Aurora Serverless Cluster
    const auroraCluster = new rds.DatabaseCluster(
      this,
      "AuroraServerlessCluster",
      {
        engine: cdk.aws_rds.DatabaseClusterEngine.auroraPostgres({
          version: cdk.aws_rds.AuroraPostgresEngineVersion.VER_16_4,
        }),
        defaultDatabaseName: "postgres",
        credentials: rds.Credentials.fromSecret(dbSecret),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        writer: rds.ClusterInstance.serverlessV2("WriterInstance", {
          publiclyAccessible: false,
        }),
        vpc: vpc,
        vpcSubnets: vpc.selectSubnets({
          subnetGroupName: "Private",
        }),
        serverlessV2MaxCapacity: 1.0,
        serverlessV2MinCapacity: 0.0,
        cloudwatchLogsExports: ["postgresql"],
        cloudwatchLogsRetention: logs.RetentionDays.ONE_WEEK,
        storageEncrypted: true,
      }
    );
    auroraCluster.connections.allowFrom(appSg, ec2.Port.tcp(5432));
  }
}
