package com.gestioncave.charge;

import com.gestioncave.analyse.AnalyseService;
import com.gestioncave.analyse.dto.AnalyseMargeResponse;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.charge.dto.ChargeResponse;
import com.gestioncave.charge.dto.RentabiliteResponse;
import com.gestioncave.charge.dto.RentabiliteResponse.TotalCategorie;
import com.gestioncave.common.BusinessException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.security.AppUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcule la rentabilité nette d'un mois (module 7) : bénéfice net après charges,
 * répartition des charges par catégorie et seuil de rentabilité. Réservé au propriétaire.
 */
@Service
@Transactional(readOnly = true)
public class RentabiliteService {

    private final AnalyseService analyseService;
    private final ChargeRepository chargeRepository;
    private final EtablissementRepository etablissementRepository;
    private final CalculService calcul;

    public RentabiliteService(AnalyseService analyseService,
                              ChargeRepository chargeRepository,
                              EtablissementRepository etablissementRepository,
                              CalculService calcul) {
        this.analyseService = analyseService;
        this.chargeRepository = chargeRepository;
        this.etablissementRepository = etablissementRepository;
        this.calcul = calcul;
    }

    public RentabiliteResponse rentabilite(AppUserDetails user, Long etablissementId,
                                           int annee, int mois) {
        if (mois < 1 || mois > 12) {
            throw new BusinessException("Le mois doit être compris entre 1 et 12.");
        }

        LocalDate debut = LocalDate.of(annee, mois, 1);
        LocalDate fin = debut.plusMonths(1).minusDays(1);

        // Bénéfice brut et chiffre d'affaires du mois (réutilise l'analyse du module 6).
        AnalyseMargeResponse analyse = analyseService.analyserMarges(user, etablissementId, debut, fin);
        BigDecimal chiffreAffaires = analyse.chiffreAffaires();
        BigDecimal beneficeBrut = analyse.beneficeBrut();

        // Charges du mois sur le périmètre.
        List<Charge> charges;
        if (etablissementId != null) {
            charges = chargeRepository
                    .findByEtablissementIdAndAnneeAndMoisOrderByCategorieAscLibelleAsc(
                            etablissementId, annee, mois);
        } else {
            List<Long> ids = etablissementRepository.findAll().stream().map(Etablissement::getId).toList();
            charges = ids.isEmpty()
                    ? List.of()
                    : chargeRepository.findByEtablissementIdInAndAnneeAndMoisOrderByCategorieAscLibelleAsc(
                            ids, annee, mois);
        }

        BigDecimal totalCharges = charges.stream()
                .map(Charge::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Répartition par catégorie (ordre stable).
        Map<CategorieCharge, BigDecimal> parCategorie = new LinkedHashMap<>();
        for (CategorieCharge cat : CategorieCharge.values()) {
            parCategorie.put(cat, BigDecimal.ZERO);
        }
        for (Charge c : charges) {
            parCategorie.merge(c.getCategorie(), c.getMontant(), BigDecimal::add);
        }
        List<TotalCategorie> chargesParCategorie = new ArrayList<>();
        parCategorie.forEach((cat, montant) -> chargesParCategorie.add(new TotalCategorie(cat, montant)));

        BigDecimal beneficeNet = calcul.beneficeNet(beneficeBrut, totalCharges);
        BigDecimal tauxMarge = calcul.tauxMarge(beneficeBrut, chiffreAffaires);
        BigDecimal seuilCA = calcul.seuilRentabiliteCA(totalCharges, tauxMarge);
        boolean beneficiaire = beneficeNet.signum() >= 0;

        return new RentabiliteResponse(
                etablissementId, annee, mois,
                chiffreAffaires, beneficeBrut, totalCharges,
                chargesParCategorie, beneficeNet, beneficiaire,
                tauxMarge, seuilCA,
                charges.stream().map(ChargeResponse::from).toList());
    }
}
