import * as cdk from 'aws-cdk-lib';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { SecretValue, Stack, StackProps, Stage } from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class MathApiPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const source = pipelines.CodePipelineSource.gitHub('Wijithapaw/math-api', 'cdk-demo', {
      authentication: SecretValue.secretsManager("GITHUB_TOKEN_WIJITHAPAW"),
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK
    });

    const mathapi_build = new pipelines.CodeBuildStep('MathApiBuild', {
      input: source,
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0
      },
      primaryOutputDirectory: "src/publish",
      commands: [
        'cd src',
        'dotnet publish ./MathApi/SqrtLambda/SqrtLambda.csproj -c Release -o publish',
      ]
    });

    const mathapi_square_build = new pipelines.CodeBuildStep('MathApiBuildSquare', {
      input: source,
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0
      },
      primaryOutputDirectory: "src/publishsquare",
      commands: [
        'cd src',
        'dotnet publish ./MathApi/SquareLambda/SquareLambda.csproj -c Release -o publishsquare',
      ]
    });

    const pipepine_build = new pipelines.CodeBuildStep('PipelineBuild', {
      input: source,
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0
      },
      primaryOutputDirectory: "pipeline/cdk.out",
      commands: [
        'cd pipeline',
        'npm install -g aws-cdk@2.32.1; npm install;',
        'npm run cdk synth'
      ],
      additionalInputs: {
        'pipeline/out/math-api': mathapi_build,
        'pipeline/out/math-api-square': mathapi_square_build
      }
    });

    const pipeline = new pipelines.CodePipeline(this, "MathApiPipeline", {
      synth: pipepine_build,
      pipelineName: 'math-api-pipeline'
    });

    const dev_stage = new DeployStage(this, "DevStage", props);

    pipeline.addStage(dev_stage);
  }
}


export class DeployStage extends Stage {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const sqrtlambda = new SqrtlambdaStack(this, "SqrtlambdaStack");
    const squarelambda = new SquarelambdaStack(this, "SquarelambdaStack");
    const api = new ApiGwStack(this, "ApiGwStack", { sqrtlambda: sqrtlambda.lambda, squarelambda: squarelambda.lambda });
  }
}

export class SqrtlambdaStack extends Stack {
  lambda: lambda.Function;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sqrtLambda = new lambda.Function(this, "SqrtLambda", {
      code: lambda.Code.fromAsset('out/math-api'),
      runtime: lambda.Runtime.DOTNET_6,
      handler: 'SqrtLambda::SqrtLambda.Function::FunctionHandler',
      functionName: 'Sqrt'
    });

    this.lambda = sqrtLambda;
  }
}

export class SquarelambdaStack extends Stack {
  lambda: lambda.Function;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sqrtLambda = new lambda.Function(this, "SqrtLambda", {
      code: lambda.Code.fromAsset('out/math-api-square'),
      runtime: lambda.Runtime.DOTNET_6,
      handler: 'SquareLambda::SquareLambda.Function::FunctionHandler',
      functionName: 'Square'
    });

    this.lambda = sqrtLambda;
  }
}

export interface ApiGwStackProps extends StackProps {
  sqrtlambda: lambda.Function,
  squarelambda: lambda.Function
}

export class ApiGwStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiGwStackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, "MathApiGateway", {});

    const sqrt = api.root.addResource("sqrt")
    const sqrt_num = sqrt.addResource("{number}");
    sqrt_num.addMethod('GET', new apigateway.LambdaIntegration(props.sqrtlambda));

    const square = api.root.addResource("square")
    const square_num = square.addResource("{number}");
    square_num.addMethod('GET', new apigateway.LambdaIntegration(props.squarelambda));
  }
}