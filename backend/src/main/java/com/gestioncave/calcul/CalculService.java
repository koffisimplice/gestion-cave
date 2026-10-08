package com.gestioncave.calcul;

import com.gestioncave.common.BusinessException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Cœur de calcul de l'application. TOUTES les formules financières et de stock
 * transitent par ce service, testé unitairement, pour garantir une fiabilité de 100 %.
 *
 * Conventions :
 *  - Les montants sont des {@link BigDecimal} arrondis au centième (HALF_UP).
 *  - Les quantités (bouteilles) sont des entiers.
 */
@Service
public class CalculService {

    /** Échelle monétaire : 2 décimales. */
    public static final int ECHELLE_MONETAIRE = 2;

    /**
     * Prix de revient unitaire = prix d'achat du casier / nombre de bouteilles du casier.
     *
     * @param prixAchatCasier          prix d'achat d'un conditionnement (casier/carton)
     * @param bouteillesParConditionnement nombre de bouteilles par conditionnement (&gt; 0)
     */
    public BigDecimal prixRevientUnitaire(BigDecimal prixAchatCasier, int bouteillesParConditionnement) {
        if (prixAchatCasier == null) {
            throw new BusinessException("Le prix d'achat du casier est requis.");
        }
        if (bouteillesParConditionnement <= 0) {
            throw new BusinessException("Le nombre de bouteilles par conditionnement doit être supérieur à 0.");
        }
        return prixAchatCasier.divide(
                BigDecimal.valueOf(bouteillesParConditionnement),
                ECHELLE_MONETAIRE,
                RoundingMode.HALF_UP);
    }

    /**
     * Marge unitaire = prix de vente unitaire − prix de revient unitaire.
     */
    public BigDecimal margeUnitaire(BigDecimal prixVenteUnitaire, BigDecimal prixRevientUnitaire) {
        if (prixVenteUnitaire == null || prixRevientUnitaire == null) {
            throw new BusinessException("Les prix de vente et de revient sont requis pour calculer la marge.");
        }
        return prixVenteUnitaire.subtract(prixRevientUnitaire)
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    /**
     * Bénéfice = marge unitaire × quantité vendue.
     * Peut être négatif si la marge l'est (vente à perte).
     */
    public BigDecimal benefice(BigDecimal margeUnitaire, int quantiteVendue) {
        if (margeUnitaire == null) {
            throw new BusinessException("La marge unitaire est requise pour calculer le bénéfice.");
        }
        if (quantiteVendue < 0) {
            throw new BusinessException("La quantité vendue ne peut pas être négative.");
        }
        return margeUnitaire.multiply(BigDecimal.valueOf(quantiteVendue))
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    /**
     * Valorisation d'un stock = quantité × prix unitaire (de revient ou de vente).
     */
    public BigDecimal valorisation(int quantite, BigDecimal prixUnitaire) {
        if (prixUnitaire == null) {
            throw new BusinessException("Le prix unitaire est requis pour valoriser le stock.");
        }
        if (quantite < 0) {
            throw new BusinessException("La quantité ne peut pas être négative.");
        }
        return prixUnitaire.multiply(BigDecimal.valueOf(quantite))
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    //  Formules du registre journalier (stock)
    // ------------------------------------------------------------------

    /**
     * Nouveau stock = ancien stock + commande du jour.
     */
    public int nouveauStock(int ancienStock, int commandeDuJour) {
        if (ancienStock < 0) {
            throw new BusinessException("L'ancien stock ne peut pas être négatif.");
        }
        if (commandeDuJour < 0) {
            throw new BusinessException("La commande du jour ne peut pas être négative.");
        }
        return ancienStock + commandeDuJour;
    }

    /**
     * Stock vendu = nouveau stock − stock restant.
     * Le stock restant doit être compris entre 0 et le nouveau stock.
     */
    public int stockVendu(int nouveauStock, int stockRestant) {
        if (stockRestant < 0) {
            throw new BusinessException("Le stock restant ne peut pas être négatif.");
        }
        if (stockRestant > nouveauStock) {
            throw new BusinessException(
                    "Le stock restant (" + stockRestant + ") ne peut pas dépasser le nouveau stock ("
                            + nouveauStock + ").");
        }
        return nouveauStock - stockRestant;
    }

    /**
     * Stock restant = nouveau stock − stock vendu (modèle « caisse » : on saisit le vendu).
     * Le stock vendu doit être compris entre 0 et le nouveau stock (on ne peut pas vendre
     * plus que le stock disponible).
     */
    public int stockRestant(int nouveauStock, int stockVendu) {
        if (stockVendu < 0) {
            throw new BusinessException("Le stock vendu ne peut pas être négatif.");
        }
        if (stockVendu > nouveauStock) {
            throw new BusinessException(
                    "Le stock vendu (" + stockVendu + ") ne peut pas dépasser le stock disponible ("
                            + nouveauStock + ").");
        }
        return nouveauStock - stockVendu;
    }

    /**
     * Stock restant en tenant compte des pertes = nouveau stock − stock vendu − stock perdu
     * (modèle « caisse » enrichi). La perte (casse, périmé, offert...) réduit le stock sans
     * générer de chiffre d'affaires. Le total sorti (vendu + perdu) ne peut pas dépasser le
     * stock disponible.
     */
    public int stockRestant(int nouveauStock, int stockVendu, int stockPerdu) {
        if (stockVendu < 0) {
            throw new BusinessException("Le stock vendu ne peut pas être négatif.");
        }
        if (stockPerdu < 0) {
            throw new BusinessException("Le stock perdu ne peut pas être négatif.");
        }
        int sortie = stockVendu + stockPerdu;
        if (sortie > nouveauStock) {
            throw new BusinessException(
                    "Le total vendu + perdu (" + sortie + ") ne peut pas dépasser le stock disponible ("
                            + nouveauStock + ").");
        }
        return nouveauStock - sortie;
    }

    /**
     * Prix de vente total (P.V.T) = stock vendu × prix unitaire.
     */
    public BigDecimal prixVenteTotal(int stockVendu, BigDecimal prixUnitaire) {
        if (prixUnitaire == null) {
            throw new BusinessException("Le prix unitaire est requis.");
        }
        if (stockVendu < 0) {
            throw new BusinessException("Le stock vendu ne peut pas être négatif.");
        }
        return prixUnitaire.multiply(BigDecimal.valueOf(stockVendu))
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    //  Formules des achats / commandes fournisseurs
    // ------------------------------------------------------------------

    /**
     * Conversion casiers → bouteilles = nombre de casiers × bouteilles par casier.
     */
    public int bouteillesAchetees(int nombreCasiers, int bouteillesParCasier) {
        if (nombreCasiers <= 0) {
            throw new BusinessException("Le nombre de casiers doit être supérieur à 0.");
        }
        if (bouteillesParCasier <= 0) {
            throw new BusinessException("Le nombre de bouteilles par casier doit être supérieur à 0.");
        }
        return nombreCasiers * bouteillesParCasier;
    }

    /**
     * Montant total d'un achat = prix d'achat du casier × nombre de casiers.
     */
    public BigDecimal montantAchat(BigDecimal prixAchatCasier, int nombreCasiers) {
        if (prixAchatCasier == null) {
            throw new BusinessException("Le prix d'achat du casier est requis.");
        }
        if (nombreCasiers <= 0) {
            throw new BusinessException("Le nombre de casiers doit être supérieur à 0.");
        }
        return prixAchatCasier.multiply(BigDecimal.valueOf(nombreCasiers))
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    //  Formules des charges et de la rentabilité (module 7)
    // ------------------------------------------------------------------

    /** Échelle des taux (ratios) : 4 décimales. */
    public static final int ECHELLE_TAUX = 4;

    /**
     * Bénéfice net = bénéfice brut − total des charges du mois.
     * Négatif si les charges dépassent le bénéfice brut (déficitaire).
     */
    public BigDecimal beneficeNet(BigDecimal beneficeBrut, BigDecimal totalCharges) {
        if (beneficeBrut == null || totalCharges == null) {
            throw new BusinessException("Le bénéfice brut et le total des charges sont requis.");
        }
        return beneficeBrut.subtract(totalCharges)
                .setScale(ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }

    /**
     * Taux de marge = bénéfice brut / chiffre d'affaires (0 si le CA est nul).
     * Sert de base au calcul du seuil de rentabilité.
     */
    public BigDecimal tauxMarge(BigDecimal beneficeBrut, BigDecimal chiffreAffaires) {
        if (beneficeBrut == null || chiffreAffaires == null) {
            throw new BusinessException("Le bénéfice brut et le chiffre d'affaires sont requis.");
        }
        if (chiffreAffaires.signum() <= 0) {
            return BigDecimal.ZERO.setScale(ECHELLE_TAUX, RoundingMode.HALF_UP);
        }
        return beneficeBrut.divide(chiffreAffaires, ECHELLE_TAUX, RoundingMode.HALF_UP);
    }

    /**
     * Seuil de rentabilité (en chiffre d'affaires) = total des charges / taux de marge.
     * C'est le CA à réaliser pour que le bénéfice brut couvre exactement les charges.
     * Renvoie {@code null} si le taux de marge est nul ou négatif (seuil non atteignable).
     */
    public BigDecimal seuilRentabiliteCA(BigDecimal totalCharges, BigDecimal tauxMarge) {
        if (totalCharges == null || tauxMarge == null) {
            throw new BusinessException("Le total des charges et le taux de marge sont requis.");
        }
        if (tauxMarge.signum() <= 0) {
            return null;
        }
        return totalCharges.divide(tauxMarge, ECHELLE_MONETAIRE, RoundingMode.HALF_UP);
    }
}
