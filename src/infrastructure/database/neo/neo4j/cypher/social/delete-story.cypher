// Delete story from Neo4j
MATCH (story:Story {id: $storyId})
OPTIONAL MATCH (story)<-[r]-()
DELETE r, story
RETURN count(story) as deleted
