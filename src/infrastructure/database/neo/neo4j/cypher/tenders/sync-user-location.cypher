// Store/Update user location in Neo4j for geospatial queries
// This ensures that user locations are synchronized between PostgreSQL and Neo4j

MERGE (user:User {id: $userId})
SET user.name = $name,
    user.username = $username,
    user.isProfessional = $isProfessional,
    user.activityCategory = $activityCategory,
    user.gpsCoordinates = $gpsCoordinates,
    user.city = $city,
    user.district = $district,
    user.status = $status,
    user.contactNumbers = $contactNumbers,
    user.updatedAt = datetime()

// Create a point property for spatial queries (if coordinates provided)
WITH user
WHERE $gpsCoordinates IS NOT NULL
SET user.location = point({
  latitude: toFloat(split($gpsCoordinates, ',')[0]),
  longitude: toFloat(split($gpsCoordinates, ',')[1])
})

RETURN user.id as userId,
       user.gpsCoordinates as gpsCoordinates,
       user.location as location
