# Découverte Géolocalisée - Implementation Guide

## Overview

This document describes the implementation of the geolocalized discovery feature for HITADY, allowing users to search for professionals by proximity with advanced filtering capabilities.

## Features Implemented

### 1. Proximity-Based Search
- **Automatic or manual geolocation**: Users can provide their GPS coordinates
- **Adjustable search radius**: From 500m to 50km (default: 5km)
- **Distance calculation**: Uses Haversine formula for accurate distance computation
- **Distance sorting**: Results can be sorted by proximity to user's location

### 2. Search Capabilities
- **Text search**: Search by professional name, username, category, or service description
- **Category filtering**: Filter by main category (e.g., "Artisanat & Création")
- **Subcategory filtering**: Filter by specific subcategory (e.g., "Menuiserie")
- **Autocomplete suggestions**: Real-time search suggestions for categories and professionals

### 3. Advanced Filters

#### Distance Filters
- Plus proche (closest first)
- Moins de 2km
- Custom radius (500m to 50km)

#### Rating Filters
- Minimum rating score (0-100)
- Based on overall average rating from rating system

#### Availability Filters
- **open-now**: Currently available professionals
- **available-today**: Professionals available today
- **any**: All professionals regardless of status

#### Status Filters
- **available**: Ready to take jobs
- **busy**: Currently occupied
- **online**: Online but may be busy
- **any**: All statuses

#### Special Services (Future Enhancement)
- Delivery service
- Emergency service
- Warranty/guarantee

### 4. Standardized Categories

The system includes 5 main categories with their subcategories:

#### Artisanat & Création
- Menuiserie, Ébénisterie, Charpenterie
- Ferronnerie, Soudure, Métallurgie
- Bijouterie, Joaillerie
- Couture, Broderie, Textile

#### Services Auto & Mécanique
- Mécanicien auto/moto
- Carrossier, Peinture auto
- Vulcanisateur
- Électricien automobile

#### Alimentation & Restauration
- Hotely gasy
- Boulangerie, Pâtisserie
- Traiteur, Mpanao vary
- Bar à jus, Glacier

#### Services à la Personne
- Coiffeur, Barbier
- Esthéticienne, Manucure
- Massage traditionnel
- Blanchisserie

#### Bâtiment & Réparations
- Maçon, Carreleur
- Plombier, Électricien
- Peintre en bâtiment
- Réparation électroménager

## API Endpoints

### Search Endpoint

**POST /api/discovery/search**

Search for professionals with advanced filters.

Request body:
```json
{
  "latitude": -18.8792,
  "longitude": 47.5079,
  "radius": 5000,
  "query": "menuiserie",
  "category": "artisanat-creation",
  "subcategory": "menuiserie",
  "minRating": 70,
  "availability": "open-now",
  "status": "available",
  "sortBy": "distance",
  "page": 1,
  "limit": 20
}
```

Response:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "user_123",
        "username": "menuisier_pro",
        "name": "Jean Rakoto",
        "image": "https://...",
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

### Nearby Search (Simplified)

**GET /api/discovery/nearby?lat=-18.8792&lon=47.5079&radius=5000&limit=20**

Quick search for professionals near a location.

### Search Suggestions

**GET /api/discovery/suggestions?q=menu**

Get autocomplete suggestions for categories and professionals.

Response:
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
        "label": "Jean Rakoto",
        "username": "menuisier_pro",
        "category": "Menuiserie",
        "image": "https://..."
      }
    ]
  }
}
```

### Category Endpoints

**GET /api/discovery/categories**

Get all available categories.

**GET /api/discovery/categories/:categoryCode/subcategories**

Get subcategories for a specific category.

**GET /api/discovery/subcategories**

Get all subcategories.

### Distance Calculator

**GET /api/discovery/distance?lat1=-18.8792&lon1=47.5079&lat2=-18.8800&lon2=47.5090**

Calculate distance between two GPS coordinates.

Response:
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

## Database Integration

### PostgreSQL Tables Used

- **users**: Professional profile data with GPS coordinates
- **ratingStatistics**: Cached rating statistics for filtering

### Neo4j Cypher Queries

Three Cypher query files are available for advanced graph-based searches:

1. **search-by-proximity.cypher**: Advanced proximity search with Neo4j's spatial functions
2. **search-by-area.cypher**: Search by city/district
3. **get-top-professionals.cypher**: Get top-rated professionals by category

## Geolocation Utilities

The `geo.util.ts` provides:

- **calculateDistance**: Haversine formula for distance calculation
- **parseGpsCoordinates**: Parse GPS string format
- **getBoundingBox**: Calculate search area bounds
- **sortByDistance**: Sort results by proximity
- **filterByDistance**: Filter results within radius

## Usage Examples

### Frontend Integration

```typescript
// Search for nearby professionals
const searchNearby = async (latitude: number, longitude: number) => {
  const response = await fetch('/api/discovery/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      radius: 5000, // 5km
      sortBy: 'distance'
    })
  })
  
  const data = await response.json()
  return data.data.providers
}

// Get search suggestions
const getSuggestions = async (query: string) => {
  const response = await fetch(`/api/discovery/suggestions?q=${query}`)
  const data = await response.json()
  return data.data.suggestions
}

// Get all categories for filters
const getCategories = async () => {
  const response = await fetch('/api/discovery/categories')
  const data = await response.json()
  return data.data.categories
}
```

### Mobile App Integration

```typescript
// Get user's current location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords
  
  // Search with filters
  const professionals = await fetch('/api/discovery/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      radius: 10000, // 10km
      category: 'services-personne',
      subcategory: 'coiffeur',
      minRating: 70,
      availability: 'open-now',
      sortBy: 'rating'
    })
  })
})
```

## Testing

### Manual Testing Checklist

- [x] POST /api/discovery/search - Basic search
- [x] POST /api/discovery/search - With GPS coordinates
- [x] POST /api/discovery/search - With category filter
- [x] POST /api/discovery/search - With rating filter
- [x] POST /api/discovery/search - With availability filter
- [x] GET /api/discovery/suggestions - Search suggestions
- [x] GET /api/discovery/categories - List categories
- [x] GET /api/discovery/subcategories - List subcategories
- [x] GET /api/discovery/nearby - Simple proximity search
- [x] GET /api/discovery/distance - Distance calculation

### Test Scenarios

1. **Search without location**: Should return all professionals
2. **Search with location**: Should return only within radius
3. **Search with filters**: Should apply all filters correctly
4. **Empty results**: Should handle gracefully
5. **Invalid coordinates**: Should return error
6. **Invalid radius**: Should use default (5km)

## Performance Considerations

1. **Caching**: Consider caching category data (rarely changes)
2. **Indexing**: GPS coordinates field should be indexed
3. **Pagination**: Implemented with page/limit parameters
4. **Distance calculation**: Done in-memory for filtered results
5. **Database queries**: Optimized with proper joins

## Future Enhancements

1. **Interactive map display**: Display results on a map with colored pins
2. **Clustering**: Group nearby professionals for dense areas
3. **Routing integration**: Add directions via Google Maps
4. **Compass mode**: "Around me" view with bearing
5. **Real-time updates**: WebSocket for status changes
6. **Save searches**: Allow users to save favorite searches
7. **History**: Search history and recently viewed
8. **Push radius**: Dynamically expand radius if few results

## Security & Privacy

- GPS coordinates are optional
- No tracking of user location without consent
- Professional locations are public data
- Filter parameters are validated
- SQL injection protection via ORM
- Rate limiting recommended for production

## Deployment Notes

1. Ensure database has GPS coordinates populated
2. Consider geospatial database extensions for production
3. Add monitoring for search performance
4. Set up analytics for popular searches
5. Configure CORS for allowed origins

## Related Features

- **Rating System**: Provides rating data for filtering
- **User Profiles**: Source of professional data
- **Badge System**: Can be integrated for verified badges
- **Neo4j Graph**: Enhanced recommendations and connections

## Support

For issues or questions about the discovery feature:
- Check API documentation at `/docs`
- Review this implementation guide
- Test endpoints with example data
- Check logs for error details

---

**Implementation Date**: 2024
**Version**: 1.0.0
**Status**: ✅ Complete and tested
