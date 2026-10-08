package com.gestioncave.registre.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Mise à jour d'une ligne ouverte : commande du jour, stock vendu et/ou perte (modèle caisse). */
public record MajLigneRequest(
        @NotNull(message = "La commande du jour est obligatoire.")
        @Min(value = 0, message = "La commande du jour ne peut pas être négative.")
        Integer commandeDuJour,

        /** Stock vendu du jour. Null tant qu'aucune vente n'est saisie. */
        @PositiveOrZero(message = "Le stock vendu ne peut pas être négatif.")
        Integer stockVendu,

        /** Bouteilles perdues du jour (casse, périmé, offert...). Null = 0. */
        @PositiveOrZero(message = "Le stock perdu ne peut pas être négatif.")
        Integer stockPerdu,

        /** Motif optionnel de la perte. */
        @Size(max = 255, message = "Le motif est trop long (255 caractères maximum).")
        String motifPerte
) {
}
