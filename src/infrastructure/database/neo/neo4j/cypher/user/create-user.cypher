CREATE (u:User {
  id: $id, 
  name: $name, 
  email: $email,
  username: $username
})
RETURN u
