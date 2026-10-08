# --- Étape 1 : build du jar avec Maven + JDK 17 ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache des dépendances : on copie d'abord le pom, puis on résout hors-ligne
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Puis le code source et le package (tests ignorés pour accélérer le build image)
COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Étape 2 : image d'exécution légère (JRE 17 seulement) ---
FROM eclipse-temurin:17-jre
WORKDIR /app

# Récupère le jar construit à l'étape précédente
COPY --from=build /app/target/gestion-cave-backend-0.0.1-SNAPSHOT.jar app.jar

# La plupart des hébergeurs (Render, Railway…) injectent la variable PORT.
# L'application lit PORT puis SERVER_PORT puis 8080 (voir application.yml).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
