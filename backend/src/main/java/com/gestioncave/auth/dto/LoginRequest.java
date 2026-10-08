package com.gestioncave.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        // Identifiant de connexion : email ou numéro de téléphone.
        @NotBlank(message = "L'identifiant est obligatoire.")
        String email,

        @NotBlank(message = "Le mot de passe est obligatoire.")
        String motDePasse
) {
}
