// Get users who engaged with similar content
MATCH (user:User {id: $userId})-[:LIKES]->(post:Post)
MATCH (similarUser:User)-[:LIKES]->(post)
WHERE similarUser.id <> $userId
  AND NOT (user)-[:FOLLOWS]->(similarUser)
WITH similarUser, count(DISTINCT post) as commonLikes
WHERE commonLikes >= $minCommonLikes
RETURN similarUser.id as userId,
       commonLikes
ORDER BY commonLikes DESC
LIMIT $limit
