# Stage 1: Build Spring Boot application with Java 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Lightweight Java 21 Runtime optimized for Render Free Tier (512MB RAM)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Xmx350m -Xms128m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Dspring.jmx.enabled=false -Dserver.compression.enabled=true -Dserver.compression.mime-types=application/json,text/html,text/plain -Dserver.compression.min-response-size=512 -Dserver.port=${PORT:-8080} -jar app.jar"]
