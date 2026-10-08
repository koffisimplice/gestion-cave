package com.gestioncave.charge.dto;

import com.gestioncave.charge.CategorieCharge;
import com.gestioncave.charge.Periodicite;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/** Saisie/modification d'une charge d'exploitation. */
public record ChargeRequest(
        @NotNull(message = "L'établissement est obligatoire.")
        Long etablissementId,

        @NotNull(message = "La catégorie est obligatoire.")
        CategorieCharge categorie,

        @NotBlank(message = "Le libellé est obligatoire.")
        @Size(max = 200, message = "Le libellé ne peut pas dépasser 200 caractères.")
        String libelle,

        @NotNull(message = "Le montant est obligatoire.")
        @PositiveOrZero(message = "Le montant ne peut pas être négatif.")
        BigDecimal montant,

        @NotNull(message = "La périodicité est obligatoire.")
        Periodicite periodicite,

        @NotNull(message = "L'année est obligatoire.")
        @Min(value = 2000, message = "Année invalide.")
        Integer annee,

        @NotNull(message = "Le mois est obligatoire.")
        @Min(value = 1, message = "Le mois doit être compris entre 1 et 12.")
        @Max(value = 12, message = "Le mois doit être compris entre 1 et 12.")
        Integer mois
) {
}
