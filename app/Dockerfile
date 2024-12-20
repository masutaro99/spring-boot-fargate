FROM public.ecr.aws/amazoncorretto/amazoncorretto:17
ADD https://github.com/aws-observability/aws-otel-java-instrumentation/releases/download/v1.32.6/aws-opentelemetry-agent.jar ./aws-opentelemetry-agent.jar
COPY ./build/libs/sample-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]