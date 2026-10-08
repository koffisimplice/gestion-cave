package com.gestioncave.boisson.dto;

import com.gestioncave.boisson.TypeConditionnement;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.Set;

public record BoissonRequest(
        @NotBlank(message = "La désignation est obligatoire.")
        @Size(max = 255)
        String designation,

        /** Type de conditionnement d'achat. Si absent, « casier » est appliqué. */
        TypeConditionnement typeConditionnement,

        @Min(value = 1, message = "Le conditionnement doit contenir au moins 1 bouteille.")
        int bouteillesParConditionnement,

        @NotNull(message = "Le prix d'achat du casier est obligatoire.")
        @PositiveOrZero(message = "Le prix d'achat doit être positif.")
        BigDecimal prixAchatCasier,

        @NotNull(message = "Le prix de vente unitaire est obligatoire.")
        @PositiveOrZero(message = "Le prix de vente doit être positif.")
        BigDecimal prixVenteUnitaire,

        @PositiveOrZero(message = "Le seuil d'alerte doit être positif.")
        int seuilAlerte,

        @Size(max = 255)
        String categorie,

        @Size(max = 1024)
        String photoUrl,

        /** Établissements où rendre la boisson disponible (partage sans ressaisie). */
        @NotEmpty(message = "Sélectionnez au moins un établissement.")
        Set<Long> etablissementIds
) {
}
