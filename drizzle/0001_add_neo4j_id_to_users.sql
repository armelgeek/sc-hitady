-- Migration: Ajout du champ neo4j_id à la table users
ALTER TABLE users ADD COLUMN neo4j_id TEXT;
