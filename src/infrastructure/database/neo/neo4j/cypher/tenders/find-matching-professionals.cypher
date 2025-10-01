// Find suitable professionals for a tender based on proximity, category, and rating
// This query finds professionals within a certain radius who match the tender requirements

MATCH (provider:User)
WHERE provider.isProfessional = true
  AND provider.activityCategory = $category
  AND provider.status IN ['available', 'online']
  AND provider.gpsCoordinates IS NOT NULL

// Calculate distance using point() and distance()
WITH provider,
     point({latitude: toFloat(split(provider.gpsCoordinates, ',')[0]), 
            longitude: toFloat(split(provider.gpsCoordinates, ',')[1])}) as providerLocation,
     point({latitude: $latitude, longitude: $longitude}) as tenderLocation

WITH provider,
     providerLocation,
     tenderLocation,
     round(distance(providerLocation, tenderLocation) / 1000, 2) as distanceKm

WHERE distanceKm <= $radiusKm

// Get rating statistics
OPTIONAL MATCH (client:User)-[r:RATED]->(provider)
WITH provider,
     distanceKm,
     count(r) as totalRatings,
     avg(r.overallScore) as avgScore,
     sum(CASE WHEN r.wouldRecommend = true THEN 1 ELSE 0 END) as recommendations

// Filter by minimum rating if specified
WHERE ($minRating IS NULL OR avgScore >= $minRating)

// Calculate matching score based on various factors
WITH provider,
     distanceKm,
     totalRatings,
     avgScore,
     recommendations,
     // Matching score calculation (0-100)
     toInteger(
       // Distance score (50% weight) - closer is better
       (1 - (distanceKm / $radiusKm)) * 50 +
       // Rating score (30% weight)
       CASE WHEN avgScore IS NOT NULL THEN (avgScore / 100) * 30 ELSE 0 END +
       // Experience score (20% weight) - more ratings is better
       CASE WHEN totalRatings > 0 THEN least(totalRatings / 10, 1) * 20 ELSE 0 END
     ) as matchingScore

RETURN provider.id as professionalId,
       provider.name as professionalName,
       provider.username as professionalUsername,
       provider.activityCategory as category,
       provider.gpsCoordinates as gpsCoordinates,
       provider.status as status,
       provider.contactNumbers as contactNumbers,
       distanceKm,
       totalRatings,
       avgScore,
       recommendations,
       matchingScore

ORDER BY matchingScore DESC, distanceKm ASC
LIMIT $limit
