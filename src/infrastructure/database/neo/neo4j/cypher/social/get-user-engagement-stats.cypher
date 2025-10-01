// Get user engagement statistics
MATCH (user:User {id: $userId})
OPTIONAL MATCH (user)-[like:LIKES]->(post:Post)
OPTIONAL MATCH (user)-[comment:COMMENTS_ON]->(post2:Post)
OPTIONAL MATCH (user)-[save:SAVES]->(post3:Post)
OPTIONAL MATCH (user)-[follow:FOLLOWS]->(following:User)
OPTIONAL MATCH (follower:User)-[followed:FOLLOWS]->(user)
RETURN count(DISTINCT like) as totalLikes,
       count(DISTINCT comment) as totalComments,
       count(DISTINCT save) as totalSaves,
       count(DISTINCT follow) as followingCount,
       count(DISTINCT followed) as followersCount
