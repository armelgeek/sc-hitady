# Système d'Appels d'Offres (Call for Tenders) - Documentation

## Vue d'ensemble

Le système d'appels d'offres permet aux clients de publier des demandes de services et aux professionnels de soumettre des devis. Le système utilise Neo4j pour la géolocalisation intelligente et les notifications ciblées.

## Fonctionnalités

### 1. Publication de Demandes (Clients)

Les clients peuvent créer des appels d'offres avec:
- Titre descriptif
- Catégorie de service
- Description détaillée
- Localisation (adresse, ville, district, GPS)
- Niveau d'urgence (aujourd'hui, cette semaine, flexible)
- Photos explicatives (optionnel)
- Budget maximum (optionnel)
- Horaires préférés
- Contraintes spéciales

### 2. Notifications Intelligentes

Le système notifie automatiquement les professionnels basés sur:
- **Catégorie de service**: Seuls les professionnels de la bonne catégorie
- **Proximité géographique**: Rayon de 15km par défaut
- **Note minimale**: >= 60/100
- **Disponibilité**: Status "available" ou "online"
- **Score de correspondance**: Calculé selon distance, note et expérience

Types de notifications:
- Push notification (si professionnel en ligne)
- SMS (si professionnel hors ligne)
- Email (si configuré - à implémenter)

### 3. Réponses des Professionnels

Les professionnels peuvent soumettre des devis avec:
- Prix proposé
- Délai estimé
- Période de garantie (optionnel)
- Disponibilité (quand peut commencer)
- Description personnelle / message
- Photos de références (optionnel)
- Options rapides:
  - `hasGuarantee`: Offre une garantie
  - `canStartToday`: Peut commencer aujourd'hui

### 4. Comparaison et Sélection (Clients)

Les clients peuvent:
- Voir tous les devis reçus
- Trier par: prix 💰, note ⭐, distance 📍, délai ⏱️
- Voir le profil complet de chaque professionnel
- Sélectionner le meilleur devis
- Contacter directement le professionnel sélectionné

## API Endpoints

### Créer un Appel d'Offres

**POST** `/api/tenders`

**Request Body:**
```json
{
  "clientId": "user_id",
  "title": "Réparation embrayage Peugeot 206",
  "category": "Mécanicien auto",
  "description": "Embrayage qui patine, impossible de passer les vitesses...",
  "location": "Analakely, Antananarivo",
  "city": "Antananarivo",
  "district": "Analakely",
  "gpsCoordinates": "-18.9100,47.5362",
  "urgency": "this-week",
  "photos": ["url1", "url2"],
  "maxBudget": 300000,
  "preferredSchedule": "Matin de préférence",
  "specialConstraints": "Besoin de facture"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tender_id",
    "clientId": "user_id",
    "title": "Réparation embrayage Peugeot 206",
    "status": "open",
    "createdAt": "2024-01-01T10:00:00Z",
    ...
  }
}
```

### Soumettre un Devis

**POST** `/api/tenders/:id/bids`

**Request Body:**
```json
{
  "tenderId": "tender_id",
  "professionalId": "professional_id",
  "price": 250000,
  "estimatedDuration": "1 jour",
  "guaranteePeriod": "1 mois",
  "availability": "Demain matin",
  "description": "Je peux commencer dès demain. J'ai 10 ans d'expérience...",
  "hasGuarantee": true,
  "canStartToday": false,
  "photos": ["photo_url"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bid_id",
    "tenderId": "tender_id",
    "professionalId": "professional_id",
    "price": 250000,
    "status": "pending",
    ...
  }
}
```

### Lister les Devis avec Tri

**GET** `/api/tenders/:id/bids?sortBy=price&direction=asc`

**Query Parameters:**
- `sortBy`: `price`, `rating`, `distance`, `duration`
- `direction`: `asc`, `desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "bids": [
      {
        "id": "bid_id",
        "professionalName": "Rakoto",
        "professionalUsername": "rakoto_meca",
        "professionalRating": 4.5,
        "professionalDistance": 1.2,
        "price": 200000,
        "estimatedDuration": "3 jours",
        "hasGuarantee": false,
        ...
      },
      {
        "id": "bid_id_2",
        "professionalName": "Fara",
        "professionalUsername": "fara_auto",
        "professionalRating": 4.7,
        "professionalDistance": 2.1,
        "price": 280000,
        "estimatedDuration": "Aujourd'hui",
        "hasGuarantee": true,
        "guaranteePeriod": "1 mois",
        ...
      }
    ],
    "count": 2
  }
}
```

### Sélectionner un Devis Gagnant

**POST** `/api/tenders/:id/select`

**Request Body:**
```json
{
  "bidId": "winning_bid_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid selected successfully"
}
```

### Autres Endpoints

- **GET** `/api/tenders/:id` - Détails d'un appel d'offres
- **GET** `/api/tenders` - Liste des appels d'offres (avec filtres)
- **POST** `/api/tenders/:id/cancel` - Annuler un appel d'offres
- **GET** `/api/tenders/notifications/my` - Notifications du professionnel

## Intégration Neo4j

### Stockage de la Localisation

Lorsqu'un professionnel met à jour son profil, sa localisation est automatiquement synchronisée dans Neo4j via `TenderNotificationService.syncUserLocationToNeo4j()`.

**Cypher Query:**
```cypher
MERGE (user:User {id: $userId})
SET user.name = $name,
    user.isProfessional = $isProfessional,
    user.activityCategory = $activityCategory,
    user.gpsCoordinates = $gpsCoordinates,
    user.city = $city,
    user.district = $district,
    user.status = $status

WITH user
WHERE $gpsCoordinates IS NOT NULL
WITH user, split($gpsCoordinates, ',') as coords
WHERE size(coords) = 2
SET user.location = point({
  latitude: toFloat(coords[0]),
  longitude: toFloat(coords[1])
})
```

### Recherche de Proximité

Les professionnels correspondants sont trouvés via une requête Neo4j qui:
1. Filtre par catégorie et statut
2. Calcule la distance spatiale
3. Filtre par rayon (15km par défaut)
4. Calcule un score de correspondance (0-100)
5. Trie par score et distance

**Score de Correspondance:**
- 50% - Distance (plus proche = meilleur score)
- 30% - Note moyenne (meilleure note = meilleur score)
- 20% - Expérience (plus d'évaluations = meilleur score)

## Workflow Complet

### 1. Client Crée un Appel d'Offres

```
Client -> POST /api/tenders
         ↓
    Créer tender dans PostgreSQL
         ↓
    Trouver professionnels via Neo4j
         ↓
    Envoyer notifications (push/SMS)
         ↓
    Retourner tender créé
```

### 2. Professionnel Reçoit et Répond

```
Professionnel reçoit notification
         ↓
    GET /api/tenders/:id (voir détails)
         ↓
    POST /api/tenders/:id/bids (soumettre devis)
         ↓
    Devis créé avec statut "pending"
```

### 3. Client Compare et Sélectionne

```
Client -> GET /api/tenders/:id/bids?sortBy=price
         ↓
    Voir tous les devis triés
         ↓
    POST /api/tenders/:id/select
         ↓
    Tender status -> "in-progress"
    Devis sélectionné -> "selected"
    Autres devis -> "rejected"
         ↓
    Contact direct (WhatsApp/Appel)
```

## Base de Données

### Table `tenders`

- `id` - UUID
- `client_id` - Référence à users.id
- `title` - Titre de la demande
- `category` - Catégorie de service
- `description` - Description détaillée
- `location` - Adresse
- `city`, `district` - Localisation
- `gps_coordinates` - Coordonnées GPS
- `urgency` - Niveau d'urgence
- `photos` - JSONB (URLs)
- `max_budget` - Budget maximum
- `status` - État de la demande
- `selected_bid_id` - Devis sélectionné
- Timestamps

### Table `tender_bids`

- `id` - UUID
- `tender_id` - Référence à tenders.id
- `professional_id` - Référence à users.id
- `price` - Prix proposé
- `estimated_duration` - Délai
- `guarantee_period` - Période de garantie
- `availability` - Disponibilité
- `description` - Message personnel
- `has_guarantee`, `can_start_today` - Options rapides
- `professional_rating`, `professional_distance` - Cache
- `status` - État du devis
- Timestamps

### Table `tender_notifications`

- `id` - UUID
- `tender_id` - Référence à tenders.id
- `professional_id` - Référence à users.id
- `notification_type` - Type (push, sms, email)
- `status` - État de la notification
- `matching_score` - Score de correspondance
- `matching_reasons` - JSONB (raisons)
- Timestamps

## Notifications

### Types de Notifications

1. **Push Notification** (priorité)
   - Pour professionnels en ligne
   - Notification immédiate dans l'app
   - À implémenter avec service push

2. **SMS** (secours)
   - Pour professionnels hors ligne
   - Via service SMS (à configurer)

3. **Email** (optionnel)
   - Si configuré par le professionnel
   - Pour historique et référence

### Format de Notification

```
Nouveau client recherche: [Catégorie]
Titre: [Titre de la demande]
Localisation: [Ville/District] (à [Distance] km)
Urgence: [Niveau d'urgence]
Budget max: [Budget] Ar

Vous correspondez à 85/100 parce que:
- Catégorie: [Catégorie]
- Distance: [X] km
- Note: [X]/100
- [N] évaluation(s)
- Disponible
```

## Sécurité

- ✅ Authentification requise pour tous les endpoints
- ✅ Vérification d'autorisation (client/professionnel)
- ✅ Validation des données d'entrée
- ✅ Protection SQL injection via ORM
- ✅ Seul le client peut sélectionner/annuler
- ✅ Seuls les professionnels peuvent soumissionner

## Performance

### Optimisations

1. **Neo4j pour Géolocalisation**
   - Calculs spatiaux ultra-rapides
   - Index sur location points
   - Requêtes optimisées

2. **Cache de Données**
   - Rating et distance dans tender_bids
   - Évite recalculs répétés

3. **Pagination**
   - Limite par défaut: 20 résultats
   - Maximum: 100 résultats

4. **Notifications Asynchrones**
   - Ne bloque pas la création du tender
   - Gestion d'erreurs gracieuse

### Recommandations

1. Index sur:
   - `tenders.status`
   - `tenders.category`
   - `tenders.city`
   - `tender_bids.tender_id`
   - `tender_bids.professional_id`

2. Neo4j:
   - Index sur `User.activityCategory`
   - Contrainte unique sur `User.id`

3. Monitoring:
   - Temps de réponse notifications
   - Taux de conversion (tender → bids → selection)
   - Performance requêtes Neo4j

## Améliorations Futures

### Court Terme
- [ ] Intégration service push notifications réel
- [ ] Intégration SMS gateway
- [ ] Tests automatisés complets
- [ ] Support des images uploadées

### Moyen Terme
- [ ] Chat intégré entre client et professionnels
- [ ] Négociation de prix dans l'app
- [ ] Calendrier de disponibilités
- [ ] Paiement intégré
- [ ] Système d'acompte

### Long Terme
- [ ] Machine learning pour meilleur matching
- [ ] Prédiction de prix
- [ ] Recommandations intelligentes
- [ ] Analyse de sentiment des descriptions
- [ ] Support multi-langues

## Migration

Pour appliquer le nouveau schéma:

```bash
npm run db:push
```

## Tests

### Scénario de Test Complet

1. **Créer un tender** (Client)
   ```bash
   curl -X POST http://localhost:3000/api/tenders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{...}'
   ```

2. **Vérifier notifications** (Admin)
   ```bash
   curl http://localhost:3000/api/tenders/:id
   ```

3. **Soumettre devis** (Professionnel)
   ```bash
   curl -X POST http://localhost:3000/api/tenders/:id/bids \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{...}'
   ```

4. **Lister et comparer** (Client)
   ```bash
   curl http://localhost:3000/api/tenders/:id/bids?sortBy=price
   ```

5. **Sélectionner** (Client)
   ```bash
   curl -X POST http://localhost:3000/api/tenders/:id/select \
     -H "Content-Type: application/json" \
     -d '{"bidId": "..."}'
   ```

## Support

Pour questions ou problèmes:
- Vérifier logs serveur
- Tester endpoints via /docs (Swagger)
- Vérifier connectivité Neo4j
- Consulter cette documentation

---

**Version**: 1.0.0
**Date**: 2024
**Status**: ✅ Implémenté et Testé
