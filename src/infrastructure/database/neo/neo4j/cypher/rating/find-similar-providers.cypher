// Find similar providers based on rating patterns
MATCH (provider:User {id: $providerId})
MATCH (provider)<-[r1:RATED]-(client:User)-[r2:RATED]->(similar:User)
WHERE similar.id <> provider.id 
  AND similar.isProfessional = true
  AND abs(r1.overallScore - r2.overallScore) <= $scoreThreshold
WITH similar, 
     count(DISTINCT client) as commonClients,
     avg(r2.overallScore) as avgScore
WHERE commonClients >= $minCommonClients
RETURN similar.id as providerId,
       similar.name as providerName,
       similar.username as providerUsername,
       similar.activityCategory as category,
       commonClients,
       avgScore
ORDER BY commonClients DESC, avgScore DESC
LIMIT $limit
