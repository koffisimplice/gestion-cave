package com.gestioncave.commande.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Saisie d'un achat / d'une commande fournisseur. */
public record CommandeRequest(
        @NotNull(message = "La boisson est obligatoire.")
        Long boissonId,

        @NotNull(message = "L'établissement est obligatoire.")
        Long etablissementId,

        /** Date de l'achat. Si absente, la date du jour est utilisée. */
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate date,

        @NotNull(message = "Le nombre de casiers est obligatoire.")
        @Min(value = 1, message = "Le nombre de casiers doit être d'au moins 1.")
        Integer nombreCasiers,

        /** Nom libre du fournisseur (optionnel, utilisé si aucune fiche n'est sélectionnée). */
        String fournisseur,

        /** Fiche fournisseur sélectionnée (optionnelle). Prioritaire sur le nom libre. */
        Long fournisseurId,

        /**
         * Prix d'achat du casier (optionnel). Pris en compte uniquement pour le propriétaire ;
         * sinon le prix du catalogue est appliqué automatiquement.
         */
        @Positive(message = "Le prix d'achat du casier doit être positif.")
        BigDecimal prixAchatCasier
) {
}
