package com.gestioncave.fournisseur.dto;

import com.gestioncave.fournisseur.Fournisseur;

import java.math.BigDecimal;

/**
 * Vue d'un fournisseur, enrichie de statistiques d'achats. Le montant total
 * dépensé n'est renseigné que pour le propriétaire ({@code null} pour un gérant).
 */
public record FournisseurResponse(
        Long id,
        String nom,
        String telephone,
        String contact,
        String adresse,
        String notes,
        boolean actif,
        long nombreAchats,
        BigDecimal montantTotalAchats
) {
    public static FournisseurResponse from(Fournisseur f, long nombreAchats, BigDecimal montantTotal) {
        return new FournisseurResponse(
                f.getId(),
                f.getNom(),
                f.getTelephone(),
                f.getContact(),
                f.getAdresse(),
                f.getNotes(),
                f.isActif(),
                nombreAchats,
                montantTotal);
    }
}
