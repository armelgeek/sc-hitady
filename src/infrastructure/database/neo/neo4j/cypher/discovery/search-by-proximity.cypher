// Search professionals by proximity with advanced filters
MATCH (provider:User)
WHERE provider.isProfessional = true
  AND provider.gpsCoordinates IS NOT NULL
  AND ($category IS NULL OR provider.activityCategory CONTAINS $category)
  AND ($query IS NULL OR 
       toLower(provider.name) CONTAINS toLower($query) OR
       toLower(provider.username) CONTAINS toLower($query) OR
       toLower(provider.activityCategory) CONTAINS toLower($query))
  AND ($status IS NULL OR provider.status = $status)

// Calculate distance using Haversine formula
WITH provider,
     point({latitude: $latitude, longitude: $longitude}) as userLocation,
     point({
       latitude: toFloat(split(provider.gpsCoordinates, ',')[0]),
       longitude: toFloat(split(provider.gpsCoordinates, ',')[1])
     }) as providerLocation
WITH provider, 
     distance(userLocation, providerLocation) as distanceMeters
WHERE distanceMeters <= $radiusMeters

// Get rating statistics
OPTIONAL MATCH (client:User)-[r:RATED]->(provider)
WITH provider, distanceMeters,
     count(r) as totalRatings,
     avg(r.overallScore) as avgScore,
     sum(CASE WHEN r.wouldRecommend = true THEN 1 ELSE 0 END) as recommendations

WHERE ($minRating IS NULL OR avgScore >= $minRating)

RETURN provider.id as providerId,
       provider.name as providerName,
       provider.username as providerUsername,
       provider.activityCategory as category,
       provider.serviceDescription as description,
       provider.gpsCoordinates as coordinates,
       provider.address as address,
       provider.status as status,
       provider.image as image,
       provider.isVerified as isVerified,
       distanceMeters,
       totalRatings,
       avgScore,
       CASE WHEN totalRatings > 0 
            THEN toFloat(recommendations) / totalRatings 
            ELSE 0.0 
       END as recommendationRate
ORDER BY distanceMeters ASC
LIMIT $limit
