using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace SqrtLambda;

public class Function
{
    public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var numStr = request.PathParameters["number"];

            if (!int.TryParse(numStr, out var num))
                throw new ApplicationException($"Invalid number supplied: {numStr}");

            var sqrt = Math.Sqrt(num);

            return new APIGatewayProxyResponse
            {
                Body = sqrt.ToString(),
                StatusCode = 200
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Unhandled error. {ex.Message}");

            return new APIGatewayProxyResponse
            {
                Body = "Unknown Error",
                StatusCode = 500
            };
        }
    }
}