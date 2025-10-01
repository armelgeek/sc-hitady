// Get follow recommendations based on mutual connections
MATCH (user:User {id: $userId})-[:FOLLOWS]->(followed:User)
MATCH (followed)-[:FOLLOWS]->(recommended:User)
WHERE recommended.id <> $userId 
  AND NOT (user)-[:FOLLOWS]->(recommended)
WITH recommended, count(DISTINCT followed) as mutualConnections
RETURN recommended.id as userId, 
       mutualConnections
ORDER BY mutualConnections DESC
LIMIT $limit
