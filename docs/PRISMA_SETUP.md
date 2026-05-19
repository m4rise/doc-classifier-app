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
