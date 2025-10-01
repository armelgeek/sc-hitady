// Get all ratings for a provider with client information
MATCH (client:User)-[r:RATED]->(provider:User {id: $providerId})
RETURN client.id as clientId, 
       client.name as clientName, 
       client.username as clientUsername,
       r.ratingId as ratingId,
       r.qualityScore as qualityScore,
       r.punctualityScore as punctualityScore,
       r.honestyScore as honestyScore,
       r.communicationScore as communicationScore,
       r.cleanlinessScore as cleanlinessScore,
       r.overallScore as overallScore,
       r.rapidityMeticulousness as rapidityMeticulousness,
       r.flexibilityRigor as flexibilityRigor,
       r.communicativeDiscreet as communicativeDiscreet,
       r.innovativeTraditional as innovativeTraditional,
       r.createdAt as createdAt
ORDER BY r.createdAt DESC
