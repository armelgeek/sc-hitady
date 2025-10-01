// Find professionals in a specific area/district
MATCH (provider:User)
WHERE provider.isProfessional = true
  AND ($city IS NULL OR toLower(provider.city) = toLower($city))
  AND ($district IS NULL OR toLower(provider.district) = toLower($district))
  AND ($category IS NULL OR provider.activityCategory CONTAINS $category)
  AND ($status IS NULL OR provider.status = $status)

// Get rating statistics
OPTIONAL MATCH (client:User)-[r:RATED]->(provider)
WITH provider,
     count(r) as totalRatings,
     avg(r.overallScore) as avgScore,
     sum(CASE WHEN r.wouldRecommend = true THEN 1 ELSE 0 END) as recommendations

WHERE ($minRating IS NULL OR avgScore >= $minRating)

RETURN provider.id as providerId,
       provider.name as providerName,
       provider.username as providerUsername,
       provider.activityCategory as category,
       provider.serviceDescription as description,
       provider.city as city,
       provider.district as district,
       provider.address as address,
       provider.gpsCoordinates as coordinates,
       provider.status as status,
       provider.image as image,
       provider.isVerified as isVerified,
       totalRatings,
       avgScore,
       CASE WHEN totalRatings > 0 
            THEN toFloat(recommendations) / totalRatings 
            ELSE 0.0 
       END as recommendationRate
ORDER BY avgScore DESC, totalRatings DESC
LIMIT $limit
