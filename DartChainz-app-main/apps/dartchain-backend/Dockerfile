# —— Build ——
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline -DskipTests

COPY src src
RUN ./mvnw -q -B package -DskipTests

# —— Runtime ——
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --uid 10001 appuser \
    && mkdir -p /app/data \
    && chown appuser:appuser /app/data

COPY --from=build /app/target/*.jar /app/app.jar

USER appuser

EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "/app/app.jar"]
