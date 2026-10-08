package com.gestioncave.personnel.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Marque le salaire d'un employé comme payé pour un mois donné. */
public record PaiementRequest(
        @NotNull(message = "L'employé est obligatoire.")
        Long employeId,

        @NotNull(message = "L'année est obligatoire.")
        @Min(value = 2000, message = "Année invalide.")
        Integer annee,

        @NotNull(message = "Le mois est obligatoire.")
        @Min(value = 1, message = "Le mois doit être compris entre 1 et 12.")
        @Max(value = 12, message = "Le mois doit être compris entre 1 et 12.")
        Integer mois,

        @NotNull(message = "Le montant est obligatoire.")
        @PositiveOrZero(message = "Le montant ne peut pas être négatif.")
        BigDecimal montant,

        @NotNull(message = "La date de paiement est obligatoire.")
        LocalDate datePaiement
) {
}
