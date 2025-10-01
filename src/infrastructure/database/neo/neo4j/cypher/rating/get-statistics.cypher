// Get rating statistics for a provider
MATCH (client:User)-[r:RATED]->(provider:User {id: $providerId})
RETURN 
  count(r) as totalRatings,
  avg(r.overallScore) as avgOverall,
  avg(r.qualityScore) as avgQuality,
  avg(r.punctualityScore) as avgPunctuality,
  avg(r.honestyScore) as avgHonesty,
  avg(r.communicationScore) as avgCommunication,
  avg(r.cleanlinessScore) as avgCleanliness,
  avg(r.rapidityMeticulousness) as avgRapidityMeticulousness,
  avg(r.flexibilityRigor) as avgFlexibilityRigor,
  avg(r.communicativeDiscreet) as avgCommunicativeDiscreet,
  avg(r.innovativeTraditional) as avgInnovativeTraditional,
  count(CASE WHEN r.overallScore >= 60 THEN 1 END) as satisfiedClients,
  (count(CASE WHEN r.overallScore >= 60 THEN 1 END) * 100.0 / count(r)) as recommendationRate
