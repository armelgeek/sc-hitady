# API Testing Examples - Découverte Géolocalisée

This document provides example requests and responses for testing the discovery endpoints.

## Base URL

```
http://localhost:3000/api/discovery
```

## 1. Advanced Search

### Basic Proximity Search

**Request:**
```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 5000,
    "sortBy": "distance",
    "page": 1,
    "limit": 20
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "user_123",
        "username": "menuisier_pro",
        "name": "Jean Rakoto",
        "image": "https://example.com/photo.jpg",
        "isVerified": true,
        "district": "Antananarivo",
        "city": "Antananarivo",
        "activityCategory": "Menuiserie",
        "serviceDescription": "Menuiserie de qualité...",
        "address": "Lot II M 123 Bis",
        "gpsCoordinates": "-18.8792,47.5079",
        "status": "available",
        "averageScore": 85.5,
        "totalRatings": 42,
        "recommendationRate": 0.95,
        "distance": 1250
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "hasMore": false
    }
  }
}
```

### Search with Category Filter

**Request:**
```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 10000,
    "category": "services-personne",
    "sortBy": "rating",
    "page": 1,
    "limit": 10
  }'
```

### Search with Text Query

**Request:**
```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "menuiserie",
    "radius": 50000,
    "sortBy": "rating",
    "page": 1,
    "limit": 20
  }'
```

### Search with All Filters

**Request:**
```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 5000,
    "query": "coiffeur",
    "category": "services-personne",
    "subcategory": "coiffeur",
    "minRating": 70,
    "availability": "open-now",
    "status": "available",
    "sortBy": "distance",
    "page": 1,
    "limit": 20
  }'
```

### Search without Location

**Request:**
```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "électricien",
    "minRating": 60,
    "sortBy": "rating",
    "page": 1,
    "limit": 50
  }'
```

## 2. Nearby Search (GET)

### Simple Proximity Search

**Request:**
```bash
curl "http://localhost:3000/api/discovery/nearby?lat=-18.8792&lon=47.5079&radius=5000&limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "user_456",
        "username": "electricien_rapide",
        "name": "Paul Andrianina",
        "image": null,
        "isVerified": true,
        "district": "Antananarivo",
        "city": "Antananarivo",
        "activityCategory": "Électricien",
        "serviceDescription": "Installation et réparation électrique",
        "address": "67 Rue de la République",
        "gpsCoordinates": "-18.8800,47.5090",
        "status": "available",
        "averageScore": 78.5,
        "totalRatings": 28,
        "distance": 980
      }
    ],
    "count": 12
  }
}
```

### With Custom Radius

**Request:**
```bash
curl "http://localhost:3000/api/discovery/nearby?lat=-18.8792&lon=47.5079&radius=2000&limit=10"
```

## 3. Search Suggestions

### Get Suggestions for "menu"

**Request:**
```bash
curl "http://localhost:3000/api/discovery/suggestions?q=menu"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "subcategory",
        "value": "menuiserie",
        "label": "Menuiserie",
        "category": "Artisanat & Création"
      },
      {
        "type": "professional",
        "value": "user_123",
        "label": "Jean Rakoto - Menuisier",
        "username": "menuisier_pro",
        "category": "Menuiserie",
        "image": "https://example.com/photo.jpg"
      }
    ]
  }
}
```

### Get Suggestions for "coif"

**Request:**
```bash
curl "http://localhost:3000/api/discovery/suggestions?q=coif"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "subcategory",
        "value": "coiffeur",
        "label": "Coiffeur",
        "category": "Services à la Personne"
      }
    ]
  }
}
```

## 4. Categories

### Get All Categories

**Request:**
```bash
curl "http://localhost:3000/api/discovery/categories"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "code": "artisanat-creation",
        "name": "Artisanat & Création"
      },
      {
        "code": "auto-mecanique",
        "name": "Services Auto & Mécanique"
      },
      {
        "code": "alimentation-restauration",
        "name": "Alimentation & Restauration"
      },
      {
        "code": "services-personne",
        "name": "Services à la Personne"
      },
      {
        "code": "batiment-reparations",
        "name": "Bâtiment & Réparations"
      }
    ]
  }
}
```

## 5. Subcategories

### Get All Subcategories

**Request:**
```bash
curl "http://localhost:3000/api/discovery/subcategories"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subcategories": [
      {
        "code": "menuiserie",
        "name": "Menuiserie",
        "categoryCode": "artisanat-creation",
        "categoryName": "Artisanat & Création"
      },
      {
        "code": "coiffeur",
        "name": "Coiffeur",
        "categoryCode": "services-personne",
        "categoryName": "Services à la Personne"
      }
    ]
  }
}
```

### Get Subcategories for a Category

**Request:**
```bash
curl "http://localhost:3000/api/discovery/categories/services-personne/subcategories"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subcategories": [
      {
        "code": "coiffeur",
        "name": "Coiffeur",
        "categoryCode": "services-personne",
        "categoryName": "Services à la Personne"
      },
      {
        "code": "barbier",
        "name": "Barbier",
        "categoryCode": "services-personne",
        "categoryName": "Services à la Personne"
      },
      {
        "code": "estheticienne",
        "name": "Esthéticienne",
        "categoryCode": "services-personne",
        "categoryName": "Services à la Personne"
      }
    ]
  }
}
```

## 6. Distance Calculator

### Calculate Distance Between Two Points

**Request:**
```bash
curl "http://localhost:3000/api/discovery/distance?lat1=-18.8792&lon1=47.5079&lat2=-18.8800&lon2=47.5090"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distanceMeters": 1234,
    "distanceKm": 1.23,
    "formatted": "1.2km"
  }
}
```

**Short Distance:**
```bash
curl "http://localhost:3000/api/discovery/distance?lat1=-18.8792&lon1=47.5079&lat2=-18.8795&lon2=47.5082"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distanceMeters": 387,
    "distanceKm": 0.39,
    "formatted": "387m"
  }
}
```

## Error Responses

### Invalid Coordinates

**Request:**
```bash
curl "http://localhost:3000/api/discovery/nearby?lat=invalid&lon=47.5079"
```

**Response:**
```json
{
  "error": "Invalid coordinates",
  "status": 400
}
```

### Missing Required Parameters

**Request:**
```bash
curl "http://localhost:3000/api/discovery/nearby?lat=-18.8792"
```

**Response:**
```json
{
  "error": "Latitude and longitude are required",
  "status": 400
}
```

### Invalid Radius

The API will use the default radius (5000m) if an invalid value is provided.

## Testing Scenarios

### Scenario 1: Find Nearest Coiffeur

1. Get user's location: `-18.8792, 47.5079`
2. Search for coiffeur within 2km
3. Sort by distance

```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 2000,
    "subcategory": "coiffeur",
    "sortBy": "distance",
    "limit": 5
  }'
```

### Scenario 2: Find Top-Rated Electricians

1. Search without location
2. Filter by category: "batiment-reparations"
3. Filter by subcategory: "electricien"
4. Minimum rating: 80
5. Sort by rating

```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "category": "batiment-reparations",
    "subcategory": "electricien",
    "minRating": 80,
    "sortBy": "rating",
    "limit": 10
  }'
```

### Scenario 3: Find Available Restaurants

1. Get user's location
2. Search for "hotely gasy" or food services
3. Filter by availability: "open-now"
4. Sort by rating

```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 5000,
    "category": "alimentation-restauration",
    "availability": "open-now",
    "sortBy": "rating",
    "limit": 20
  }'
```

### Scenario 4: Search with Autocomplete

1. User types "menu"
2. Get suggestions

```bash
curl "http://localhost:3000/api/discovery/suggestions?q=menu"
```

3. User selects "Menuiserie"
4. Search for menuisiers

```bash
curl -X POST http://localhost:3000/api/discovery/search \
  -H "Content-Type: application/json" \
  -d '{
    "subcategory": "menuiserie",
    "latitude": -18.8792,
    "longitude": 47.5079,
    "radius": 10000,
    "sortBy": "rating",
    "limit": 20
  }'
```

## Testing Tips

1. **Start with simple requests**: Test each endpoint individually
2. **Use Postman or Insomnia**: Import these examples for easier testing
3. **Test error cases**: Try invalid coordinates, missing parameters
4. **Test pagination**: Try different page numbers and limits
5. **Test filters**: Combine multiple filters to ensure they work together
6. **Test edge cases**: Empty results, very large radius, etc.

## Sample GPS Coordinates for Antananarivo

For testing purposes, here are some coordinates in Antananarivo, Madagascar:

- **Analakely**: `-18.9147, 47.5229`
- **Andohalo**: `-18.9075, 47.5247`
- **67 Ha**: `-18.8792, 47.5079`
- **Ambohijatovo**: `-18.9128, 47.5311`
- **Besarety**: `-18.9211, 47.5272`

## Validation Checklist

- [ ] Basic proximity search works
- [ ] Search with category filter works
- [ ] Search with text query works
- [ ] Search with rating filter works
- [ ] Search with availability filter works
- [ ] Sorting by distance works
- [ ] Sorting by rating works
- [ ] Sorting by name works
- [ ] Pagination works
- [ ] Suggestions endpoint works
- [ ] Categories endpoint works
- [ ] Subcategories endpoint works
- [ ] Distance calculator works
- [ ] Error handling works
- [ ] Invalid coordinates rejected
- [ ] Missing parameters handled

---

**Ready to test!** Start with the basic endpoints and gradually test more complex scenarios.
