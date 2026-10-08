package com.gestioncave.calcul;

import com.gestioncave.common.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CalculServiceTest {

    private final CalculService calcul = new CalculService();

    @Test
    void prixRevientUnitaire_division_exacte() {
        // 6000 / 12 = 500.00
        assertThat(calcul.prixRevientUnitaire(new BigDecimal("6000"), 12))
                .isEqualByComparingTo("500.00");
    }

    @Test
    void prixRevientUnitaire_arrondi_half_up() {
        // 5000 / 12 = 416.6666... -> 416.67
        assertThat(calcul.prixRevientUnitaire(new BigDecimal("5000"), 12))
                .isEqualByComparingTo("416.67");
    }

    @Test
    void prixRevientUnitaire_refuse_conditionnement_nul() {
        assertThatThrownBy(() -> calcul.prixRevientUnitaire(new BigDecimal("6000"), 0))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void prixRevientUnitaire_refuse_prix_null() {
        assertThatThrownBy(() -> calcul.prixRevientUnitaire(null, 12))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void margeUnitaire_difference() {
        // 800 - 500 = 300.00
        assertThat(calcul.margeUnitaire(new BigDecimal("800"), new BigDecimal("500")))
                .isEqualByComparingTo("300.00");
    }

    @Test
    void margeUnitaire_peut_etre_negative() {
        assertThat(calcul.margeUnitaire(new BigDecimal("400"), new BigDecimal("500")))
                .isEqualByComparingTo("-100.00");
    }

    // --- Formules du registre journalier ---

    @Test
    void nouveauStock_somme() {
        assertThat(calcul.nouveauStock(30, 24)).isEqualTo(54);
    }

    @Test
    void nouveauStock_refuse_valeurs_negatives() {
        assertThatThrownBy(() -> calcul.nouveauStock(-1, 10)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> calcul.nouveauStock(10, -1)).isInstanceOf(BusinessException.class);
    }

    @Test
    void stockVendu_difference() {
        // nouveau 54, restant 12 -> vendu 42
        assertThat(calcul.stockVendu(54, 12)).isEqualTo(42);
    }

    @Test
    void stockVendu_zero_si_rien_vendu() {
        assertThat(calcul.stockVendu(54, 54)).isEqualTo(0);
    }

    @Test
    void stockVendu_refuse_restant_superieur_au_nouveau() {
        assertThatThrownBy(() -> calcul.stockVendu(54, 60)).isInstanceOf(BusinessException.class);
    }

    @Test
    void stockRestant_avec_perte_soustrait_vendu_et_perdu() {
        // 54 - 42 vendus - 2 perdus = 10
        assertThat(calcul.stockRestant(54, 42, 2)).isEqualTo(10);
    }

    @Test
    void stockRestant_avec_perte_seule() {
        // 54 - 0 vendu - 3 perdus = 51
        assertThat(calcul.stockRestant(54, 0, 3)).isEqualTo(51);
    }

    @Test
    void stockRestant_refuse_vendu_plus_perdu_superieur_au_stock() {
        // 42 + 15 = 57 > 54
        assertThatThrownBy(() -> calcul.stockRestant(54, 42, 15))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void stockRestant_refuse_perte_negative() {
        assertThatThrownBy(() -> calcul.stockRestant(54, 10, -1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void prixVenteTotal_produit() {
        // 42 vendues x 800 = 33600.00
        assertThat(calcul.prixVenteTotal(42, new BigDecimal("800")))
                .isEqualByComparingTo("33600.00");
    }

    @Test
    void prixVenteTotal_zero_si_rien_vendu() {
        assertThat(calcul.prixVenteTotal(0, new BigDecimal("800")))
                .isEqualByComparingTo("0.00");
    }

    // --- Formules des achats / commandes fournisseurs ---

    @Test
    void bouteillesAchetees_conversion_casiers() {
        // 5 casiers de 12 -> 60 bouteilles
        assertThat(calcul.bouteillesAchetees(5, 12)).isEqualTo(60);
    }

    @Test
    void bouteillesAchetees_refuse_valeurs_non_positives() {
        assertThatThrownBy(() -> calcul.bouteillesAchetees(0, 12)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> calcul.bouteillesAchetees(5, 0)).isInstanceOf(BusinessException.class);
    }

    @Test
    void montantAchat_produit() {
        // 5 casiers x 6000 = 30000.00
        assertThat(calcul.montantAchat(new BigDecimal("6000"), 5))
                .isEqualByComparingTo("30000.00");
    }

    @Test
    void montantAchat_refuse_prix_null() {
        assertThatThrownBy(() -> calcul.montantAchat(null, 5)).isInstanceOf(BusinessException.class);
    }

    // --- Formules des marges / bénéfices ---

    @Test
    void benefice_produit_marge_par_quantite() {
        // marge 300 x 42 vendues = 12600.00
        assertThat(calcul.benefice(new BigDecimal("300"), 42))
                .isEqualByComparingTo("12600.00");
    }

    @Test
    void benefice_negatif_si_marge_negative() {
        // vente a perte : marge -100 x 10 = -1000.00
        assertThat(calcul.benefice(new BigDecimal("-100"), 10))
                .isEqualByComparingTo("-1000.00");
    }

    @Test
    void benefice_refuse_quantite_negative() {
        assertThatThrownBy(() -> calcul.benefice(new BigDecimal("300"), -1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void valorisation_stock() {
        // 18 bouteilles x 500 revient = 9000.00
        assertThat(calcul.valorisation(18, new BigDecimal("500")))
                .isEqualByComparingTo("9000.00");
    }

    @Test
    void valorisation_zero_si_stock_vide() {
        assertThat(calcul.valorisation(0, new BigDecimal("500")))
                .isEqualByComparingTo("0.00");
    }

    // --- Formules des charges / rentabilité ---

    @Test
    void beneficeNet_soustrait_les_charges() {
        // 12600 brut - 6000 charges = 6600
        assertThat(calcul.beneficeNet(new BigDecimal("12600"), new BigDecimal("6000")))
                .isEqualByComparingTo("6600.00");
    }

    @Test
    void beneficeNet_deficitaire() {
        // 4000 brut - 6000 charges = -2000
        assertThat(calcul.beneficeNet(new BigDecimal("4000"), new BigDecimal("6000")))
                .isEqualByComparingTo("-2000.00");
    }

    @Test
    void tauxMarge_ratio() {
        // 12600 / 33600 = 0.375
        assertThat(calcul.tauxMarge(new BigDecimal("12600"), new BigDecimal("33600")))
                .isEqualByComparingTo("0.3750");
    }

    @Test
    void tauxMarge_zero_si_ca_nul() {
        assertThat(calcul.tauxMarge(new BigDecimal("0"), new BigDecimal("0")))
                .isEqualByComparingTo("0.0000");
    }

    @Test
    void seuilRentabilite_ca_a_realiser() {
        // charges 6000 / taux 0.375 = 16000
        assertThat(calcul.seuilRentabiliteCA(new BigDecimal("6000"), new BigDecimal("0.375")))
                .isEqualByComparingTo("16000.00");
    }

    @Test
    void seuilRentabilite_null_si_marge_non_positive() {
        assertThat(calcul.seuilRentabiliteCA(new BigDecimal("6000"), new BigDecimal("0"))).isNull();
        assertThat(calcul.seuilRentabiliteCA(new BigDecimal("6000"), new BigDecimal("-0.1"))).isNull();
    }
}
