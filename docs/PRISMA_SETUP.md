# Prisma Setup — doc-classifier-app

## Structure

- `prisma/schema.prisma` : Schéma principal (modèles, enums, mapping DB)
- `prisma/migrations/` : Historique des migrations SQL (générées par Prisma)
- `prisma.config.ts` : Config CLI Prisma 7 (chemin schema, datasource, dotenv)
- `src/generated/prisma/` : Client TypeScript généré (gitignored)

## Installation & Génération

- Installer les dépendances :
  ```sh
  npm install @prisma/client@7 @prisma/adapter-pg pg dotenv
  npm install -D prisma@7 @types/pg
  ```
- Générer le client Prisma (nécessaire après chaque modif du schéma) :
  ```sh
  npx prisma generate
  # ou via npm script : npm run db:generate
  ```

## Migrations

- Créer une migration (dev) :
  ```sh
  npx prisma migrate dev --name <nom>
  # ou via npm script : npm run db:migrate:dev -- --name <nom>
  ```
- Appliquer les migrations (prod/staging/CI) :
  ```sh
  npx prisma migrate deploy
  # ou via npm script : npm run db:migrate:deploy
  ```
- Vérifier le statut des migrations :
  ```sh
  npx prisma migrate status
  ```

## Commandes utiles

- Lancer Prisma Studio (UI DB) :
  ```sh
  npx prisma studio
  # ou via npm script : npm run db:studio
  ```
- Valider le schéma :
  ```sh
  npx prisma validate
  ```

## Bonnes pratiques

- **Ne pas committer `src/generated/prisma/`** : toujours regénérer après un clone ou un pull.
- **Committer `prisma/migrations/` et `schema.prisma`** : l’historique des migrations est la source de vérité.
- **Configurer le pool dans le code** (`PrismaService`), pas dans l’URL (Prisma 7 + adapter-pg).
- **URL complète (avec sslmode, channel_binding, etc.)** dans la variable d’environnement `DATABASE_URL` (local, staging, prod).

## Références

- [Prisma 7 migration guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma + NestJS](https://www.prisma.io/docs/guides/frameworks/nestjs)
- [Prisma Migrate — team workflow](https://www.prisma.io/docs/guides/database/schema-changes)
- [Deploying database changes](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)

---

## Convention : Emplacement du client Prisma généré

- **Le client Prisma TypeScript généré est toujours placé dans `backend/src/generated/prisma/`.**
  - Ce chemin est configuré dans `prisma/schema.prisma` via `output = "../src/generated/prisma"`.
  - L'import dans le code se fait depuis ce dossier, jamais depuis `node_modules` (Prisma 7+).
- **Jamais d'import Prisma dans `domain/` ou `application/`** : le client généré n'est utilisé que dans l'infrastructure (ex : `prisma.service.ts`). Cette règle est enforced par ESLint et fait partie des conventions clean architecture du projet.
- **Pourquoi ce choix ?**
  - Respect de la clean architecture : le code généré n'est ni dans le domaine, ni dans l'application, ni dans l'infrastructure métier, mais dans un dossier dédié, explicitement ignoré par git et Docker.
  - Alignement avec les conventions monorepo : tous les artefacts générés sont centralisés sous `src/generated/` pour éviter la confusion et faciliter le nettoyage.
  - Simplifie la configuration Docker, CI/CD et NestJS (voir `nest-cli.json` assets).
- **Enforcement :**
  - `src/generated/` est ignoré dans `.gitignore` et `.dockerignore`.
  - Le client doit être regénéré après chaque modification du schéma ou après un pull/clone (`npm run db:generate`).
  - Les scripts de build, CI et Dockerfile copient explicitement ce dossier dans l'image finale.
- **Pas de customisation complexe :**
  - Si ce choix impose trop de configuration ou de hacks, il pourra être réévalué, mais il est aligné avec les standards Prisma 7 et clean architecture.

**Référence :**

- [ADR-013-opentelemetry-grafana-cloud.md](adr/ADR-013-opentelemetry-grafana-cloud.md) (pour l'architecture générale)
- [backend/prisma.config.ts](../backend/prisma.config.ts)
- [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
- [backend/src/shared/infrastructure/database/prisma.service.ts](../backend/src/shared/infrastructure/database/prisma.service.ts)
