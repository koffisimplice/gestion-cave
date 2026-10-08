package com.gestioncave.boisson.dto;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.TypeConditionnement;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.etablissement.dto.EtablissementResponse;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

/**
 * Vue d'une boisson. Les champs de coût (prix d'achat, prix de revient) ne sont
 * renseignés que pour le propriétaire — {@code null} pour un gérant (confidentialité).
 */
public record BoissonResponse(
        Long id,
        String designation,
        TypeConditionnement typeConditionnement,
        String typeConditionnementLibelle,
        int bouteillesParConditionnement,
        BigDecimal prixVenteUnitaire,
        int seuilAlerte,
        String categorie,
        String photoUrl,
        boolean actif,
        List<EtablissementResponse> etablissements,
        // Réservés au propriétaire :
        BigDecimal prixAchatCasier,
        BigDecimal prixRevientUnitaire
) {

    public static BoissonResponse from(Boisson b, boolean inclureCouts, CalculService calcul) {
        List<EtablissementResponse> ets = b.getEtablissements().stream()
                .map(EtablissementResponse::from)
                .sorted(Comparator.comparing(EtablissementResponse::nom, String.CASE_INSENSITIVE_ORDER))
                .toList();

        BigDecimal prixAchat = inclureCouts ? b.getPrixAchatCasier() : null;
        BigDecimal prixRevient = inclureCouts
                ? calcul.prixRevientUnitaire(b.getPrixAchatCasier(), b.getBouteillesParConditionnement())
                : null;

        TypeConditionnement type = b.getTypeConditionnement() != null
                ? b.getTypeConditionnement()
                : TypeConditionnement.CASIER;

        return new BoissonResponse(
                b.getId(),
                b.getDesignation(),
                type,
                type.getLibelle(),
                b.getBouteillesParConditionnement(),
                b.getPrixVenteUnitaire(),
                b.getSeuilAlerte(),
                b.getCategorie(),
                b.getPhotoUrl(),
                b.isActif(),
                ets,
                prixAchat,
                prixRevient);
    }
}
