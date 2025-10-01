// Get top providers by category
MATCH (provider:User)-[:RATED]-(client:User)
WHERE provider.isProfessional = true 
  AND provider.activityCategory = $category
WITH provider, 
     count(client) as totalClients,
     avg(r.overallScore) as avgScore
WHERE totalClients >= $minClients
RETURN provider.id as providerId,
       provider.name as providerName,
       provider.username as providerUsername,
       provider.activityCategory as category,
       totalClients,
       avgScore
ORDER BY avgScore DESC, totalClients DESC
LIMIT $limit
