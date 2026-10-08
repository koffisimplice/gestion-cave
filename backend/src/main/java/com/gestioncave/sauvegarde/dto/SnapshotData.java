package com.gestioncave.sauvegarde.dto;

import com.gestioncave.boisson.TypeConditionnement;
import com.gestioncave.charge.CategorieCharge;
import com.gestioncave.charge.Periodicite;
import com.gestioncave.registre.StatutRegistre;
import com.gestioncave.utilisateur.Role;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Instantané complet des données de l'application, sérialisable en JSON.
 * Chaque enregistrement conserve son identifiant d'origine et les identifiants
 * des entités liées, afin de reconstruire les relations à la restauration.
 */
public record SnapshotData(
        int version,
        Instant genereLe,
        List<EtablissementSnap> etablissements,
        List<UtilisateurSnap> utilisateurs,
        List<BoissonSnap> boissons,
        List<RegistreSnap> registres,
        List<CommandeSnap> commandes,
        List<ChargeSnap> charges
) {
    public static final int VERSION_COURANTE = 1;

    public record EtablissementSnap(
            Long id, String nom, String adresse, String responsable, boolean actif) {
    }

    public record UtilisateurSnap(
            Long id, String nom, String email, String motDePasseHash,
            Role role, boolean actif, List<Long> etablissementIds) {
    }

    public record BoissonSnap(
            Long id, String designation, TypeConditionnement typeConditionnement,
            int bouteillesParConditionnement,
            BigDecimal prixAchatCasier, BigDecimal prixVenteUnitaire, int seuilAlerte,
            String categorie, String photoUrl, boolean actif, List<Long> etablissementIds) {
    }

    public record RegistreSnap(
            Long id, Long boissonId, Long etablissementId, LocalDate date,
            int ancienStock, int commandeDuJour, int nouveauStock,
            Integer stockRestant, Integer stockVendu,
            BigDecimal prixUnitaire, BigDecimal prixVenteTotal,
            StatutRegistre statut, Instant clotureAt) {
    }

    public record CommandeSnap(
            Long id, Long boissonId, Long etablissementId, LocalDate date,
            TypeConditionnement typeConditionnement,
            int nombreCasiers, int bouteillesParCasier, int bouteillesAjoutees,
            String fournisseur, BigDecimal prixAchatCasier, BigDecimal montantTotal) {
    }

    public record ChargeSnap(
            Long id, Long etablissementId, CategorieCharge categorie, String libelle,
            BigDecimal montant, Periodicite periodicite, int annee, int mois) {
    }
}
