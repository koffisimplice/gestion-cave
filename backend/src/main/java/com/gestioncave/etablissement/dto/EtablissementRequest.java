package com.gestioncave.etablissement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EtablissementRequest(
        @NotBlank(message = "Le nom est obligatoire.")
        @Size(max = 255)
        String nom,

        @Size(max = 255)
        String adresse,

        @Size(max = 255)
        String responsable
) {
}
