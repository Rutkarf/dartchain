# DART

DART est une blockchain pédagogique développée comme un projet full-stack, avec une interface **Angular** pour le front-end et une API **Spring Boot** pour le back-end. L'objectif est de proposer une chaîne simple à comprendre, orientée apprentissage, qui illustre les mécanismes fondamentaux d'une blockchain : blocs, transactions, validation, chaînage cryptographique et exposition via une API.

## Présentation du projet

Le projet DART est composé de deux parties principales :

- `frontend/` : application Angular servant d'interface utilisateur.
- `backend/` : application Spring Boot exposant les endpoints nécessaires au fonctionnement de la chaîne.

Cette architecture permet de séparer clairement :

- la couche de présentation,
- la logique métier de la chaîne,
- la communication entre client et serveur.

## Objectifs

DART a été conçu pour :

- démontrer le fonctionnement d'une blockchain simplifiée ;
- fournir une base technique claire pour l'expérimentation ;
- permettre l'exploration d'un projet full-stack moderne avec Angular et Spring Boot ;
- offrir un support pédagogique pour comprendre les principes de base d'une chaîne de blocs.

## Stack technique

### Front-end

- Angular
- TypeScript
- HTML / SCSS
- RxJS
- Angular CLI

### Back-end

- Java
- Spring Boot
- Maven ou Gradle selon la configuration du projet
- API REST

## Arborescence recommandée

```text
DART/
├── frontend/
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── ...
├── backend/
│   ├── src/
│   ├── pom.xml ou build.gradle
│   └── ...
└── README.md
```

## Cloner le dépôt

Pour récupérer le projet en local :

```bash
git clone <URL_DU_REPO>
cd DART
```

Remplace `<URL_DU_REPO>` par l'URL HTTPS ou SSH de ton dépôt Git.

## Lancer le front-end Angular

### Prérequis

Assure-toi d'avoir installé :

- Node.js
- npm
- Angular CLI

Installation globale d'Angular CLI si nécessaire :

```bash
npm install -g @angular/cli
```

### Installation des dépendances

Depuis le dossier du front-end :

```bash
cd frontend
npm install
```

### Démarrage en développement

```bash
ng serve
```

Par défaut, l'application sera accessible sur :

```text
http://localhost:4200
```

Si le projet utilise un fichier d'environnement, vérifie que l'URL de l'API Spring Boot pointe bien vers le bon port du back-end.

## Lancer le back-end Spring Boot

### Prérequis

Assure-toi d'avoir installé :

- Java 17 ou la version requise par le projet
- Maven ou Gradle selon le système de build utilisé

### Avec Maven

Depuis le dossier du back-end :

```bash
cd backend
./mvnw spring-boot:run
```

Ou, si Maven est installé globalement :

```bash
mvn spring-boot:run
```

### Avec Gradle

Si le projet utilise Gradle :

```bash
cd backend
./gradlew bootRun
```

### API locale

Par défaut, le back-end Spring Boot est généralement disponible sur :

```text
http://localhost:8080
```

Vérifie le port exact dans `application.properties` ou `application.yml`.

## Exécution complète du projet

Pour lancer l'application complète en local :

1. Démarrer le back-end Spring Boot.
2. Vérifier que l'API répond correctement.
3. Démarrer ensuite le front-end Angular.
4. Ouvrir l'application dans le navigateur via `http://localhost:4200`.

Le front-end communique alors avec le back-end pour afficher les informations liées à la chaîne DART, aux blocs, aux transactions et aux opérations exposées par l'API.

## Fonctionnement général

DART est une chaîne de blocs minimaliste pensée pour illustrer les concepts essentiels d'un système distribué de registre :

- création de blocs ;
- enchaînement des blocs par empreinte cryptographique ;
- gestion des transactions ;
- validation des données ;
- exposition des informations via une API REST.

Le projet met l'accent sur la lisibilité du code, la séparation des responsabilités et la simplicité d'exécution pour faciliter la prise en main.

## Bonnes pratiques de développement

### Front-end Angular

- Organiser le code par modules, composants, services et modèles.
- Garder les composants centrés sur l'affichage et déléguer la logique métier aux services.
- Éviter la logique complexe directement dans les templates.
- Centraliser la configuration des URLs d'API dans les fichiers d'environnement.
- Maintenir une structure claire et réutilisable.

### Back-end Spring Boot

- Séparer les couches `controller`, `service`, `repository` et `model`.
- Utiliser des noms explicites pour les classes, méthodes et variables.
- Externaliser la configuration sensible.
- Structurer les endpoints REST de manière cohérente.
- Préparer le projet pour les tests et les évolutions futures.

## Commandes utiles

### Front-end

```bash
cd frontend
npm install
ng serve
ng build
```

### Back-end Maven

```bash
cd backend
./mvnw spring-boot:run
./mvnw test
./mvnw clean package
```

### Back-end Gradle

```bash
cd backend
./gradlew bootRun
./gradlew test
./gradlew build
```

## Configuration

Selon ton implémentation, pense à vérifier :

- les variables d'environnement ;
- le port de l'API ;
- les URLs appelées par Angular ;
- la configuration CORS côté Spring Boot ;
- les fichiers `environment.ts`, `application.properties` ou `application.yml`.

## Améliorations possibles

- ajout d'authentification ;
- persistance en base de données ;
- gestion avancée des noeuds ;
- visualisation enrichie de la chaîne ;
- sécurisation renforcée des échanges ;
- tests unitaires et d'intégration complets.

## Auteur : Rutkarf

Projet développé autour de la blockchain **DART**, une chaîne conçue pour expérimenter et illustrer les bases du fonctionnement d'un registre distribué avec un front-end Angular et un back-end Spring Boot.
