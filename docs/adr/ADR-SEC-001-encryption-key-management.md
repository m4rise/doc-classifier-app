# ADR-005: AES-256-GCM Key Management

## Status
Accepted

## Context
Les données sensibles (texte extrait, métadonnées personnelles) doivent être
chiffrées at-rest conformément aux exigences RGPD et aux NFRs de sécurité.
La clé de chiffrement ne doit jamais apparaître dans le code ou les variables
d'environnement de déploiement.

## Options considérées

### AES-128-GCM
Plus rapide, toujours considéré sûr. Écarté : AES-256 est le standard de référence
pour les données sensibles en entreprise et le coût de performance est négligeable
sur les volumes ciblés.

### Chiffrement au niveau base de données (TDE)
Transparent Data Encryption géré par Neon.tech. Rejeté : protection limitée
(ne protège pas les données en cas de fuite de credentials DB), pas de contrôle
fin par champ.

### Envelope encryption avec Cloud KMS
Clé de chiffrement elle-même chiffrée par une Master Key dans Cloud KMS.
Plus robuste pour un usage multi-tenant. Écarté pour le MVP : complexité et
coût supplémentaires non justifiés à ce stade.

### AES-256-GCM + clé via GCP Secret Manager (retenu)
Clé injectée au runtime depuis Secret Manager, jamais dans le code ni dans les
fichiers d'environnement commités. Rotation possible via Secret Manager sans
redéploiement du code.

## Decision
Utiliser AES-256-GCM, clé injectée via GCP Secret Manager sur Cloud Run.

## Consequences
- Conformité sécurité renforcée (RGPD, OWASP A02).
- Gestion de secrets externalisée — zéro secret dans le code ou le repo.
- La rotation de clé nécessite un re-chiffrement des données existantes (opération
  à documenter opérationnellement).
