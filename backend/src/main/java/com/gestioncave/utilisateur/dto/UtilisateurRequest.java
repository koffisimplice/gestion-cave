package com.gestioncave.utilisateur.dto;

import com.gestioncave.utilisateur.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * Création / modification d'un utilisateur par le propriétaire.
 * Le mot de passe est obligatoire à la création, facultatif à la modification
 * (laissé vide = mot de passe inchangé) — cette règle est validée côté service.
 */
public record UtilisateurRequest(
        @NotBlank(message = "Le nom est obligatoire.")
        @Size(max = 255)
        String nom,

        // Identifiant de connexion : accepte n'importe quelle valeur (email, pseudo, etc.),
        // simplement obligatoire et unique. Le format email n'est plus imposé.
        @NotBlank(message = "L'identifiant est obligatoire.")
        @Size(max = 255)
        String email,

        /** Identifiant de connexion alternatif (optionnel, unique s'il est renseigné). */
        @Size(max = 30)
        String telephone,

        @NotNull(message = "Le rôle est obligatoire.")
        Role role,

        /** Mot de passe en clair. Obligatoire à la création ; vide = inchangé en modification.
         *  Aucune longueur minimale imposée. */
        @Size(max = 100, message = "Le mot de passe est trop long (100 caractères maximum).")
        String motDePasse,

        /** Maquis rattachés (obligatoire pour un gérant, ignoré pour un propriétaire). */
        Set<Long> etablissementIds
) {
}
