# ADR-DATA-003 : Pagination stable des documents par curseur composite

## Statut

Accepted

## Contexte

La liste des documents doit rester stable lorsque plusieurs documents partagent
la même date de création, ne jamais élargir le périmètre de l'utilisateur
authentifié et fournir un curseur opaque réutilisable par les futurs écrans.

Une pagination par simple offset se dégrade avec le volume et peut déplacer des
éléments entre deux pages lorsqu'un document est ajouté. Un curseur limité à
`createdAt` n'est pas unique. Un curseur limité à `id` ne décrit pas l'ordre
métier attendu, qui place les documents les plus récents en premier.

## Options considérées

### Offset avec `skip` et `take`

Simple à exposer, mais le coût augmente avec la profondeur et les insertions
concurrentes peuvent provoquer des doublons ou des omissions.

### Curseur sur le seul identifiant

L'identifiant est unique, mais il ne suffit pas à exprimer l'ordre chronologique
stable de la liste.

### Curseur composite lié au propriétaire (retenu)

Le tri est `createdAt DESC, id DESC`. Le client reçoit un JSON Base64 contenant
exactement `{ id, createdAt }`. Le backend complète ce payload avec le `userId`
issu du JWT et utilise la clé Prisma composite `(userId, createdAt, id)`.

## Décision

- Ajouter une contrainte unique additive sur `(userId, createdAt, id)`.
- Utiliser le curseur Prisma composite avec `skip: 1` et un lookahead
  `limit + 1`.
- Retourner `nextCursor` uniquement lorsqu'une ligne supplémentaire existe.
- Calculer `total` sur l'ensemble des documents du propriétaire, indépendamment
  du curseur courant.
- Refuser avec HTTP 400 tout curseur malformé, périmé ou appartenant à un autre
  utilisateur.
- Conserver le Base64 comme encodage opaque, sans le considérer comme un
  mécanisme de chiffrement ou de signature. L'isolation repose sur le filtre
  propriétaire et la clé composite reconstruite côté serveur.

## Conséquences

- L'ordre reste déterministe lorsque deux documents ont le même `createdAt`.
- Un curseur d'un autre utilisateur ne peut pas devenir un point de départ
  valide pour la requête.
- La requête effectue un comptage en plus de la lecture de page afin de respecter
  le contrat `total`.
- La contrainte est redondante du point de vue de l'unicité globale de `id`, mais
  elle fournit à Prisma une identité composite explicite et indexée.
- Les futurs tris de la Story 4.6 devront définir un curseur compatible avec leur
  propre clé de tri et faire évoluer explicitement le contrat si nécessaire.
