-- Ajoute le numéro de téléphone comme identifiant de connexion alternatif à l'email.
ALTER TABLE utilisateur ADD COLUMN telephone VARCHAR(30);
ALTER TABLE utilisateur ADD CONSTRAINT uk_utilisateur_telephone UNIQUE (telephone);
