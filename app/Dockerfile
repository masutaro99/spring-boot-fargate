FROM public.ecr.aws/amazoncorretto/amazoncorretto:17
ADD https://github.com/aws-observability/aws-otel-java-instrumentation/releases/download/v2.11.5/aws-opentelemetry-agent.jar ./aws-opentelemetry-agent.jar
COPY ./build/libs/sample-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]