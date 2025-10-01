# HITADY Rating System Documentation

## Overview

The HITADY rating system provides a comprehensive, transparent, and fraud-resistant way to evaluate service providers. It combines universal criteria, personality traits, profession-specific criteria, and standardized badges.

## Features

### 1. Universal Criteria (0-100 scale)

All service providers are rated on five universal criteria:

- **Quality** (qualityScore): Work quality, finish, durability, standards compliance
- **Punctuality** (punctualityScore): Respect for schedules and deadlines
- **Honesty/Price** (honestyScore): Price transparency and value for money
- **Communication** (communicationScore): Clarity of explanations and client listening
- **Cleanliness** (cleanlinessScore): Work cleanliness and respect for client property

### 2. Personality Traits (-100 to 100 scale)

Slider-based personality assessment on four axes:

- **Rapid ↔ Meticulous** (-100 to 100)
- **Flexible ↔ Rigorous** (-100 to 100)
- **Communicative ↔ Discreet** (-100 to 100)
- **Innovative ↔ Traditional** (-100 to 100)

### 3. Profession-Specific Criteria (Optional)

Additional criteria specific to each profession:

- **Mechanic**: Diagnostic precision, Work guarantee
- **Hotely Gasy**: Taste of dishes, Food hygiene
- **Hairdresser**: Creativity, Client wishes listening
- **Electrician**: Installation safety, Technical advice

### 4. Standardized Badges

Uniform badges across all profiles with categories:

- **Competence**: Reflects level or general expertise
- **Service**: Quality or speed of service
- **Fidelity**: Client recurrence or engagement
- **Identity Verified**: Identity confirmation

### 5. Global Statistics

Cached statistics for each provider:

- Total clients served (satisfied/total)
- Recommendation rate (%)
- Professional experience (years)
- HITADY membership duration
- Average response time

## API Endpoints

### Rating System

#### Submit a Rating

```http
POST /api/ratings/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "providerId": "user-id-here",
  "qualityScore": 85,
  "punctualityScore": 90,
  "honestyScore": 88,
  "communicationScore": 92,
  "cleanlinessScore": 87,
  "comment": "Excellent service, very professional",
  "contactPhone": "+261340000000",
  "personalityTraits": {
    "rapidityMeticulousness": 30,
    "flexibilityRigor": -20,
    "communicativeDiscreet": -50,
    "innovativeTraditional": 40
  },
  "specializedCriteria": {
    "profession": "mechanic",
    "criteriaScores": {
      "diagnostic_precision": 90,
      "work_guarantee": 85
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "ratingId": "rating-id",
    "overallScore": 88.4
  }
}
```

#### Get Provider Ratings

```http
GET /api/ratings/provider/:providerId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "rating": {
          "id": "rating-id",
          "qualityScore": 85,
          "punctualityScore": 90,
          "overallScore": 88.4,
          "comment": "Excellent service",
          "createdAt": "2024-01-15T10:30:00Z"
        },
        "traits": {
          "rapidityMeticulousness": 30,
          "flexibilityRigor": -20,
          "communicativeDiscreet": -50,
          "innovativeTraditional": 40
        },
        "client": {
          "id": "client-id",
          "name": "John Doe",
          "username": "johndoe"
        }
      }
    ],
    "total": 15
  }
}
```

#### Get Provider Statistics

```http
GET /api/ratings/statistics/:providerId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "provider-id",
    "avgQuality": 87.5,
    "avgPunctuality": 89.2,
    "avgHonesty": 88.0,
    "avgCommunication": 90.5,
    "avgCleanliness": 86.8,
    "avgOverall": 88.4,
    "avgRapidityMeticulousness": 25.5,
    "avgFlexibilityRigor": -15.2,
    "avgCommunicativeDiscreet": -40.8,
    "avgInnovativeTraditional": 35.6,
    "totalClients": 45,
    "satisfiedClients": 42,
    "recommendationRate": 93.33,
    "memberSince": "2023-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Report Suspicious Rating

```http
POST /api/ratings/report/:ratingId
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Suspected fake review - client never used the service"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating reported successfully"
}
```

#### Get Recommendations

Get personalized provider recommendations based on your rating history.

```http
GET /api/ratings/recommendations?limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "providerId": "provider-456",
      "providerName": "Jean Rakoto",
      "providerUsername": "jeanrakoto",
      "category": "mechanic",
      "recommendations": 5,
      "avgScore": 88.5,
      "recommendedBy": ["Alice", "Bob", "Charlie"]
    }
  ]
}
```

#### Find Similar Providers

Find providers with similar rating patterns.

```http
GET /api/ratings/similar/:providerId?limit=10&scoreThreshold=15&minCommonClients=3
```

**Query Parameters:**
- `limit`: Maximum number of results (default: 10)
- `scoreThreshold`: Maximum score difference (default: 15)
- `minCommonClients`: Minimum common clients (default: 3)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "providerId": "provider-789",
      "providerName": "Paul Andriana",
      "providerUsername": "paulandriana",
      "category": "mechanic",
      "commonClients": 8,
      "avgScore": 89.2
    }
  ]
}
```

### Badge System

#### Get All Badges

```http
GET /api/badges/list
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "badge-id",
      "name": "Expert",
      "category": "competence",
      "description": "Earned by professionals with exceptional ratings",
      "color": "#FFD700",
      "requirements": {
        "minOverallScore": 90,
        "minTotalClients": 50
      }
    }
  ]
}
```

#### Get User Badges

```http
GET /api/badges/user/:userId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "badge": {
        "id": "badge-id",
        "name": "Expert",
        "category": "competence",
        "description": "Earned by professionals with exceptional ratings",
        "color": "#FFD700"
      },
      "earnedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Auto-Assign Badges

```http
POST /api/badges/auto-assign/:userId
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-assigned 2 new badges",
  "data": {
    "newBadges": ["Expert", "Highly Recommended"]
  }
}
```

#### Create Badge (Admin Only)

```http
POST /api/badges/create
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Master Craftsman",
  "category": "competence",
  "description": "Awarded to top-tier professionals",
  "color": "#FFD700",
  "requirements": {
    "minOverallScore": 95,
    "minTotalClients": 100
  }
}
```

#### Seed Initial Badges (Admin Only)

```http
POST /api/badges/seed
Authorization: Bearer <admin-token>
```

## Validation Rules

### Rating Submission

1. **Authentication Required**: Only authenticated users can submit ratings
2. **Service Provider Validation**: Provider must exist and be marked as professional
3. **One Rating Per Client**: Each client can only rate a provider once
4. **Score Range**: All scores must be between 0-100 (universal) or -100 to 100 (traits)
5. **Contact Verification**: Must provide phone number used to contact provider

### Anti-Fraud System

1. **Automatic Detection**: System flags suspicious patterns
2. **Community Reporting**: Users can report suspicious ratings
3. **Manual Review**: Flagged ratings undergo manual review
4. **Penalties**: Confirmed fraud results in penalties

## Visual Interface

### Score Display

```
Quality:        █████████░ 85/100 (Green)
Punctuality:    ██████████ 90/100 (Green)
Honesty:        █████████░ 88/100 (Green)
Communication:  ██████████ 92/100 (Green)
Cleanliness:    █████████░ 87/100 (Green)
```

### Color Coding

- **Red** (0-30): Poor
- **Orange** (31-60): Average
- **Green** (61-100): Good/Excellent

### Personality Traits

```
Rapid ←●--------→ Meticulous  (30/100, tends toward meticulous)
Flexible ←----●---→ Rigorous   (-20/100, fairly flexible)
```

## Neo4j Integration

### Graph Database Schema

The rating system uses Neo4j to store rating relationships and enable powerful recommendation algorithms.

#### Nodes
- **User**: Represents both clients and service providers
  - Properties: `id`, `name`, `email`, `username`, `isProfessional`, `activityCategory`

#### Relationships
- **RATED**: Client → Provider relationship
  - Properties: `ratingId`, `qualityScore`, `punctualityScore`, `honestyScore`, `communicationScore`, `cleanlinessScore`, `overallScore`
  - Personality traits: `rapidityMeticulousness`, `flexibilityRigor`, `communicativeDiscreet`, `innovativeTraditional`
  - Timestamp: `createdAt`

### Recommendation Algorithms

#### 1. Collaborative Filtering
Finds providers rated highly by users with similar rating patterns:
```cypher
MATCH (user:User)-[r1:RATED]->(rated:User)
MATCH (rated)<-[r2:RATED]-(otherUser)-[r3:RATED]->(recommended:User)
WHERE recommended <> user AND NOT (user)-[:RATED]->(recommended)
RETURN recommended
ORDER BY count(DISTINCT otherUser) DESC
```

#### 2. Similar Provider Detection
Finds providers with similar rating patterns based on common clients:
```cypher
MATCH (provider:User)<-[r1:RATED]-(client:User)-[r2:RATED]->(similar:User)
WHERE similar <> provider AND abs(r1.overallScore - r2.overallScore) <= 15
WITH similar, count(DISTINCT client) as commonClients
WHERE commonClients >= 3
RETURN similar ORDER BY commonClients DESC
```

#### 3. Category-Based Recommendations
Get top providers in a specific category:
```cypher
MATCH (provider:User {activityCategory: $category})<-[r:RATED]-(client)
WITH provider, count(client) as totalClients, avg(r.overallScore) as avgScore
WHERE totalClients >= 10
RETURN provider ORDER BY avgScore DESC, totalClients DESC
```

### Cypher Queries Available

1. **create-rating.cypher**: Create rating relationship
2. **get-provider-ratings.cypher**: Get all ratings for a provider
3. **get-statistics.cypher**: Calculate provider statistics
4. **find-similar-providers.cypher**: Find similar providers
5. **get-recommendations.cypher**: Get personalized recommendations
6. **get-top-providers.cypher**: Get top providers by category

## Database Schema

### Tables

- **ratings**: Universal criteria scores and overall rating
- **personality_traits**: Personality trait scores
- **specialized_criteria**: Profession-specific criteria (JSON)
- **badges**: Badge definitions
- **user_badges**: User-badge relationships
- **rating_statistics**: Cached provider statistics
- **rating_validations**: Fraud detection and reporting

### Relationships

```
users (provider) ←─── ratings ───→ users (client)
                         ↓
                  personality_traits
                         ↓
                 specialized_criteria
                         
users ←─── user_badges ───→ badges

users ←─── rating_statistics (1:1)

ratings ←─── rating_validations
```

## Best Practices

### For Frontend Integration

1. **Display Visual Elements**: Use progress bars and color coding
2. **Show Radar Charts**: Visualize personality traits
3. **Badge Display**: Consistent placement and styling
4. **Real-time Updates**: Refresh statistics after new ratings

### For Service Providers

1. **Encourage Ratings**: Request ratings after service completion
2. **Monitor Statistics**: Track performance over time
3. **Address Issues**: Respond to concerns promptly
4. **Maintain Standards**: Strive for consistent quality

### For Clients

1. **Be Honest**: Provide accurate ratings
2. **Be Detailed**: Include helpful comments
3. **Report Fraud**: Flag suspicious ratings
4. **Wait Before Rating**: Allow 2 hours minimum for thoughtful evaluation

## Migration

To apply the database schema:

```bash
npm run db:push
```

Or manually:

```bash
psql -U postgres -d hitady -f drizzle/0001_cute_mercury.sql
```

## Testing

Example test for rating submission:

```typescript
import { describe, expect, it } from 'vitest'

describe('Rating System', () => {
  it('should submit a rating successfully', async () => {
    const response = await app.request('/api/ratings/submit', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerId: 'provider-123',
        qualityScore: 85,
        punctualityScore: 90,
        honestyScore: 88,
        communicationScore: 92,
        cleanlinessScore: 87,
        contactPhone: '+261340000000',
        personalityTraits: {
          rapidityMeticulousness: 30,
          flexibilityRigor: -20,
          communicativeDiscreet: -50,
          innovativeTraditional: 40
        }
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

## Support

For issues or questions about the rating system, please contact the HITADY development team.
