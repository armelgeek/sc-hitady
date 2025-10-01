// Get recommended providers based on user's rating history
MATCH (user:User {id: $userId})-[r1:RATED]->(rated:User)
MATCH (rated)<-[r2:RATED]-(otherUser:User)-[r3:RATED]->(recommended:User)
WHERE recommended.id <> user.id 
  AND NOT (user)-[:RATED]->(recommended)
  AND recommended.isProfessional = true
  AND r1.overallScore >= 70
  AND r3.overallScore >= 70
WITH recommended,
     count(DISTINCT otherUser) as recommendations,
     avg(r3.overallScore) as avgScore,
     collect(DISTINCT otherUser.name)[0..3] as recommendedBy
RETURN recommended.id as providerId,
       recommended.name as providerName,
       recommended.username as providerUsername,
       recommended.activityCategory as category,
       recommendations,
       avgScore,
       recommendedBy
ORDER BY recommendations DESC, avgScore DESC
LIMIT $limit
