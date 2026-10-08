package com.gestioncave.fournisseur.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Création / modification d'une fiche fournisseur (propriétaire uniquement). */
public record FournisseurRequest(
        @NotBlank(message = "Le nom du fournisseur est obligatoire.")
        @Size(max = 255)
        String nom,

        @Size(max = 30)
        String telephone,

        @Size(max = 255)
        String contact,

        @Size(max = 255)
        String adresse,

        @Size(max = 1000)
        String notes
) {
}
