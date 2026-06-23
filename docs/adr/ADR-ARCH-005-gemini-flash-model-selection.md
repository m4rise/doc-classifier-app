# ADR-ARCH-005 : Sélection du modèle Gemini Flash

## Statut
Acceptée

## Date
2026-06-19

## Contexte
La story #19 référençait initialement Gemini 2.0 Flash Vision pour le fournisseur
LLM d'infrastructure. La documentation Google AI indique désormais que
`gemini-2.0-flash` a été arrêté le 1er juin 2026. L'utiliser comme modèle par
défaut à l'exécution ferait donc échouer l'adapter en staging et en production.

Le fournisseur nécessite toujours un modèle Flash multimodal à faible latence,
capable de traiter des entrées PDF ou image et de rester utilisable dans le
quota gratuit de l'API Gemini pour les volumes du MVP.

## Options considérées

### Conserver `gemini-2.0-flash`
Rejetée, car l'endpoint du modèle est arrêté.

### Utiliser `gemini-3-flash-preview`
Rejetée comme valeur par défaut, car les modèles en préversion peuvent avoir des
limites de débit plus restrictives et des fenêtres de dépréciation plus courtes.

### Utiliser `gemini-3.1-flash-lite`
Option viable pour une extraction légère à très fort volume, mais qui privilégie
l'efficacité économique au détriment de la qualité. L'extraction, la
classification, le résumé et le score de confiance nécessitent par défaut une
meilleure précision que celle de l'option la moins coûteuse.

### Utiliser `gemini-3.5-flash`
Option retenue, car le modèle est déclaré stable, appartient à la gamme Flash,
prend en charge le quota gratuit et correspond à l'objectif du projet : une
analyse multimodale rapide en un seul appel.

## Décision
Utiliser `gemini-3.5-flash` comme modèle par défaut de l'adapter Gemini du
backend.

Le modèle reste configurable via `GEMINI_MODEL` et le délai d'expiration via
`GEMINI_TIMEOUT_MS`, avec une valeur par défaut de 8 000 ms. Les imports du SDK
`@google/generative-ai` restent confinés à `llm/infrastructure/gemini/`, derrière
le port applicatif détenu par la slice consommatrice, conformément aux
ADR-ARCH-003 et ADR-ARCH-007.

## Conséquences
- Le staging et la production n'utilisent pas l'endpoint Gemini 2.0 Flash arrêté.
- Un futur changement de modèle Google nécessite une modification de
  l'environnement, pas du code.
- L'utilisation du quota gratuit reste possible, mais les quotas actifs doivent
  être vérifiés dans Google AI Studio pour le projet.
- Le trafic de l'API Gemini utilisant le quota gratuit peut être exploité par
  Google pour améliorer ses produits. Les documents de production devront donc
  passer sur une offre payante si cela entre en conflit avec les exigences de
  traitement des données.

## Références
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/pricing
