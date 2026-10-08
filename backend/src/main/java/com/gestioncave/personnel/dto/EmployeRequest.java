package com.gestioncave.personnel.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Création / modification d'une fiche employé (propriétaire uniquement). */
public record EmployeRequest(
        @NotNull(message = "L'établissement est obligatoire.")
        Long etablissementId,

        @NotBlank(message = "Le nom de l'employé est obligatoire.")
        @Size(max = 120, message = "Le nom ne peut pas dépasser 120 caractères.")
        String nom,

        @Size(max = 80, message = "Le poste ne peut pas dépasser 80 caractères.")
        String poste,

        @NotNull(message = "Le salaire mensuel est obligatoire.")
        @PositiveOrZero(message = "Le salaire ne peut pas être négatif.")
        BigDecimal salaireMensuel,

        @Size(max = 30, message = "Le téléphone ne peut pas dépasser 30 caractères.")
        String telephone,

        LocalDate dateEmbauche
) {
}
