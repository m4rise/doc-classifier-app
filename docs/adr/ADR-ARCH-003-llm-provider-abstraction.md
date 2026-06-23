# ADR-ARCH-003 : Abstraction du fournisseur LLM

## Statut
Acceptée — propriété des ports et structure du module précisées par ADR-ARCH-007

## Contexte
Le domaine ne doit pas dépendre d'un fournisseur LLM concret.
Le marché des LLMs évolue rapidement (tarifs, capacités, disponibilité).
Un couplage direct au SDK Gemini rendrait un changement de fournisseur coûteux.

## Options considérées

### Appels SDK Gemini directs dans les use-cases
Rapide à implémenter. Rejeté : couplage fort au SDK Google AI dans la couche
application — tout changement de fournisseur nécessite de modifier les use-cases.
Impossible de tester les use-cases sans mocker le SDK Gemini.

### Fonction enveloppe dans la couche application
Couche légère au-dessus du SDK. Rejeté : toujours une dépendance au SDK dans
l'application layer, pas d'inversion de dépendance réelle.

### Interface ILlmProvider dans le domaine (retenu)
Le domaine définit le contrat (`ILlmProvider`) sans aucune référence à Gemini.
L'infrastructure implémente `GeminiProvider implements ILlmProvider`.
L'injection de dépendance NestJS fournit l'implémentation au use-case.

## Décision
Définir `ILlmProvider` côté domaine AI et implémenter Gemini en infrastructure.

## Conséquences
- Substitution fournisseur facilitée : créer un nouveau Provider sans toucher au domaine.
- Tests métier découplés des APIs externes : mock de `ILlmProvider` suffit.
- Contrainte : aucune référence au SDK Gemini dans `domain/` ou `application/` —
  vérifiable par règle ESLint sur les imports.

## Précision

ADR-ARCH-007 conserve la décision d'abstraire le fournisseur, mais remplace
l'interface générique `ILlmProvider`, auparavant détenue par un domaine `ai`,
par des ports sémantiques détenus par chaque slice métier consommatrice. Gemini
et les futurs fournisseurs résident désormais dans le module technique
d'adapters `llm/`.
