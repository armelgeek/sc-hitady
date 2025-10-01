// Create a rating relationship between client and provider
MATCH (client:User {id: $clientId})
MATCH (provider:User {id: $providerId})
CREATE (client)-[r:RATED {
  ratingId: $ratingId,
  qualityScore: $qualityScore,
  punctualityScore: $punctualityScore,
  honestyScore: $honestyScore,
  communicationScore: $communicationScore,
  cleanlinessScore: $cleanlinessScore,
  overallScore: $overallScore,
  rapidityMeticulousness: $rapidityMeticulousness,
  flexibilityRigor: $flexibilityRigor,
  communicativeDiscreet: $communicativeDiscreet,
  innovativeTraditional: $innovativeTraditional,
  createdAt: datetime($createdAt)
}]->(provider)
RETURN r
