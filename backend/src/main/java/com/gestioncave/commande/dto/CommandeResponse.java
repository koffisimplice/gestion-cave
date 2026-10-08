package com.gestioncave.commande.dto;

import com.gestioncave.boisson.TypeConditionnement;
import com.gestioncave.commande.CommandeFournisseur;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Vue d'un achat. Les champs de coût (prix d'achat du casier, montant total) ne sont
 * renseignés que pour le propriétaire — {@code null} pour un gérant (confidentialité).
 */
public record CommandeResponse(
        Long id,
        Long boissonId,
        String designation,
        Long etablissementId,
        String etablissementNom,
        LocalDate date,
        TypeConditionnement typeConditionnement,
        String typeConditionnementLibelle,
        String typeConditionnementLibellePluriel,
        int nombreCasiers,
        int bouteillesParCasier,
        int bouteillesAjoutees,
        String fournisseur,
        Long fournisseurId,
        // Réservés au propriétaire :
        BigDecimal prixAchatCasier,
        BigDecimal montantTotal
) {
    public static CommandeResponse from(CommandeFournisseur c, boolean inclureCouts) {
        TypeConditionnement type = c.getTypeConditionnement() != null
                ? c.getTypeConditionnement()
                : TypeConditionnement.CASIER;
        return new CommandeResponse(
                c.getId(),
                c.getBoisson().getId(),
                c.getBoisson().getDesignation(),
                c.getEtablissement().getId(),
                c.getEtablissement().getNom(),
                c.getDate(),
                type,
                type.getLibelle(),
                type.getLibellePluriel(),
                c.getNombreCasiers(),
                c.getBouteillesParCasier(),
                c.getBouteillesAjoutees(),
                c.getFournisseur(),
                c.getFournisseurRef() != null ? c.getFournisseurRef().getId() : null,
                inclureCouts ? c.getPrixAchatCasier() : null,
                inclureCouts ? c.getMontantTotal() : null);
    }
}
