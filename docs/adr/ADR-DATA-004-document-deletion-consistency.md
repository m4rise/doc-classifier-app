# ADR-DATA-004 : Cohérence de suppression des documents entre PostgreSQL et le stockage objet

## Statut

Accepted

## Contexte

La suppression d'un document concerne deux systèmes sans transaction distribuée :
le record PostgreSQL, qui porte l'ownership et le résultat de traitement, et
l'objet conservé dans GCS ou dans le stockage local. Une suppression partielle
peut soit laisser un fichier facturable et potentiellement personnel sans
référence exploitable, soit laisser une ligne active qui pointe vers un fichier
absent.

La Story 4.3 (#24) exige que le document disparaisse immédiatement de la vue de
l'utilisateur, que l'ownership reste opaque, et qu'une indisponibilité du
stockage ne transforme pas la requête en erreur HTTP. Le pattern RF-15 fournit
un point de reprise en conservant temporairement la référence DB.

## Options considérées

### Supprimer le fichier avant le record DB

Rejetée. Si la suppression DB échoue ensuite, un document actif référence un
objet absent. Les endpoints de détail et de traitement deviennent incohérents.

### Supprimer physiquement le record DB avant le fichier

Rejetée. Un échec du stockage laisse un objet orphelin sans tombstone permettant
de retrouver sa clé. Un simple log ne constitue pas une stratégie de reprise
fiable et augmente le risque RGPD ainsi que le coût de stockage.

### Transaction distribuée entre PostgreSQL et GCS

Rejetée. GCS ne participe pas aux transactions PostgreSQL et l'ajout d'un
coordinateur distribué serait disproportionné pour le besoin.

### Soft-delete DB, suppression objet, puis suppression DB physique (retenue)

Le record est d'abord rendu invisible avec un tombstone `deletedAt`. La
suppression idempotente de l'objet a ensuite lieu hors transaction DB. La ligne
et son `ProcessingResult` ne sont supprimés physiquement qu'après confirmation
du stockage.

## Décision

- Ajouter `Document.deletedAt` comme colonne nullable, sans backfill ni
  troncature de données.
- Filtrer `deletedAt IS NULL` dans les lectures owner-scoped, listes, comptes,
  validations de curseur et transitions de traitement.
- Réaliser la suppression dans cet ordre immuable :
  1. soft-delete owner-scoped du document ;
  2. suppression idempotente de l'objet hors transaction ;
  3. suppression physique du record soft-deleted.
- Conserver la cascade Prisma existante de `Document` vers `ProcessingResult`
  lors de la suppression physique.
- Conserver `userId` dans le prédicat de suppression physique afin que les deux
  transitions DB restent owner-scoped.
- Traiter un objet déjà absent comme une suppression réussie afin que les
  reprises soient idempotentes.
- En cas d'échec du stockage, conserver le tombstone, retourner HTTP 200 selon
  le contrat de #24 et écrire un log ERROR structuré contenant `documentId`,
  `storageKey` et l'erreur.
- Ne pas absorber les erreurs DB : un échec du soft-delete ou de la suppression
  physique reste une erreur serveur.
- Retourner HTTP 404 pour un document absent, étranger ou déjà soft-deleted afin
  de ne révéler ni ownership ni état interne de nettoyage.
- Exécuter les lectures paginées et leur comptage en isolation `REPEATABLE READ`
  afin que la validation du curseur, la page et `total` partagent le même
  snapshot face à une suppression concurrente.

## Limites opérationnelles

- `File.delete()` supprime la génération GCS active. La conservation physique
  éventuelle par Object Versioning, soft delete ou retention policy relève de
  la configuration du bucket et doit être alignée avec les exigences RGPD.
- Cette story ne définit pas encore de timeout applicatif spécifique à la
  suppression GCS. Les politiques de timeout/retry du client GCS devront être
  centralisées avec les autres opérations de stockage plutôt qu'ajoutées comme
  constante locale au use case.
- Le pipeline MVP est synchrone : l'identifiant du document n'est exposé au
  client qu'après la fin du traitement. Le futur pipeline asynchrone devra
  définir explicitement l'annulation ou la sérialisation d'un DELETE concurrent
  avec un worker de traitement.

## États et reprise

| État                               | Visibilité API          | Objet stockage | Action de reprise                                |
| ---------------------------------- | ----------------------- | -------------- | ------------------------------------------------ |
| `deletedAt = NULL`                 | Visible au propriétaire | Présent        | Aucune                                           |
| `deletedAt != NULL`, objet présent | Invisible               | Présent        | Rejouer la suppression objet puis le hard-delete |
| `deletedAt != NULL`, objet absent  | Invisible               | Absent         | Rejouer uniquement le hard-delete                |
| Ligne absente                      | Invisible               | Absent attendu | Aucune                                           |

Le job automatique de nettoyage des tombstones n'appartient pas à la Story 4.3.
Le tombstone et le log structuré rendent toutefois une reprise manuelle ou un
futur job déterministe, contrairement à un fichier GCS sans référence DB.

## Conséquences

- La suppression nominale effectue deux écritures DB séparées par un appel au
  stockage.
- Une panne GCS ne réexpose jamais le document et conserve les informations
  nécessaires au nettoyage.
- Les requêtes de documents doivent systématiquement appliquer le filtre de
  visibilité ; l'index `(userId, deletedAt, createdAt, id)` soutient les listes
  et leur comptage.
- Un échec du hard-delete après succès GCS laisse un tombstone sûr et
  récupérable, mais reste signalé comme erreur pour déclencher l'observabilité.
- La route DELETE n'est pas l'interface de retry des tombstones : un document
  déjà soft-deleted reste opaque avec HTTP 404. La reprise est une opération
  interne et privilégiée.
