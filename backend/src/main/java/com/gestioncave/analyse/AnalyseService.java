package com.gestioncave.analyse;

import com.gestioncave.analyse.dto.AnalyseMargeResponse;
import com.gestioncave.analyse.dto.LigneMargeResponse;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.common.BusinessException;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.RegistreJournalierRepository;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Analyse des marges et bénéfices (module 6) — réservé au propriétaire.
 * Agrège les ventes du registre sur une période et valorise le stock restant.
 */
@Service
@Transactional(readOnly = true)
public class AnalyseService {

    private final RegistreJournalierRepository registreRepository;
    private final BoissonRepository boissonRepository;
    private final EtablissementRepository etablissementRepository;
    private final CalculService calcul;

    public AnalyseService(RegistreJournalierRepository registreRepository,
                          BoissonRepository boissonRepository,
                          EtablissementRepository etablissementRepository,
                          CalculService calcul) {
        this.registreRepository = registreRepository;
        this.boissonRepository = boissonRepository;
        this.etablissementRepository = etablissementRepository;
        this.calcul = calcul;
    }

    public AnalyseMargeResponse analyserMarges(AppUserDetails user, Long etablissementId,
                                               LocalDate debut, LocalDate fin) {
        if (debut == null || fin == null) {
            throw new BusinessException("Les dates de début et de fin sont obligatoires.");
        }
        if (fin.isBefore(debut)) {
            throw new BusinessException("La date de fin ne peut pas précéder la date de début.");
        }

        List<Long> scope = resoudreScope(user, etablissementId);
        if (scope.isEmpty()) {
            return new AnalyseMargeResponse(etablissementId, debut, fin, 0,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of());
        }

        // 1) Ventes agrégées par boisson sur la période.
        List<RegistreJournalier> lignes = (etablissementId != null)
                ? registreRepository.findByEtablissementIdAndDateBetween(etablissementId, debut, fin)
                : registreRepository.findByEtablissementIdInAndDateBetween(scope, debut, fin);

        Map<Long, Integer> qteParBoisson = new HashMap<>();
        Map<Long, BigDecimal> caParBoisson = new HashMap<>();
        for (RegistreJournalier r : lignes) {
            if (r.getStockVendu() == null) {
                continue;
            }
            Long bid = r.getBoisson().getId();
            qteParBoisson.merge(bid, r.getStockVendu(), Integer::sum);
            BigDecimal pvt = r.getPrixVenteTotal() != null ? r.getPrixVenteTotal() : BigDecimal.ZERO;
            caParBoisson.merge(bid, pvt, BigDecimal::add);
        }

        // 2) Construction ligne par ligne pour toutes les boissons du périmètre.
        List<Boisson> boissons = boissonRepository.findActivesParEtablissements(scope);

        List<LigneMargeResponse> resultat = new java.util.ArrayList<>();
        int totalQte = 0;
        BigDecimal totalCA = BigDecimal.ZERO;
        BigDecimal totalBenefice = BigDecimal.ZERO;
        BigDecimal totalValoRevient = BigDecimal.ZERO;
        BigDecimal totalValoVente = BigDecimal.ZERO;

        for (Boisson b : boissons) {
            int qte = qteParBoisson.getOrDefault(b.getId(), 0);
            int stockRestant = stockRestantFin(b.getId(), scope, fin);

            // On ignore les boissons sans activité ni stock (bruit).
            if (qte == 0 && stockRestant == 0) {
                continue;
            }

            BigDecimal revient = calcul.prixRevientUnitaire(
                    b.getPrixAchatCasier(), b.getBouteillesParConditionnement());
            BigDecimal pv = b.getPrixVenteUnitaire();
            BigDecimal marge = calcul.margeUnitaire(pv, revient);
            BigDecimal benefice = calcul.benefice(marge, qte);
            BigDecimal ca = caParBoisson.getOrDefault(b.getId(), BigDecimal.ZERO);
            BigDecimal valoRevient = calcul.valorisation(stockRestant, revient);
            BigDecimal valoVente = calcul.valorisation(stockRestant, pv);

            resultat.add(new LigneMargeResponse(
                    b.getId(), b.getDesignation(), b.getCategorie(),
                    qte, ca, revient, pv, marge, benefice,
                    stockRestant, valoRevient, valoVente));

            totalQte += qte;
            totalCA = totalCA.add(ca);
            totalBenefice = totalBenefice.add(benefice);
            totalValoRevient = totalValoRevient.add(valoRevient);
            totalValoVente = totalValoVente.add(valoVente);
        }

        resultat.sort(Comparator.comparing(LigneMargeResponse::benefice).reversed());

        return new AnalyseMargeResponse(etablissementId, debut, fin,
                totalQte, totalCA, totalBenefice, totalValoRevient, totalValoVente, resultat);
    }

    /** Stock restant d'une boisson à la fin de la période, cumulé sur les établissements du périmètre. */
    private int stockRestantFin(Long boissonId, List<Long> scope, LocalDate fin) {
        int total = 0;
        for (Long etabId : scope) {
            int stock = registreRepository
                    .findFirstByBoissonIdAndEtablissementIdAndDateLessThanEqualOrderByDateDesc(
                            boissonId, etabId, fin)
                    .map(r -> r.getStockRestant() != null ? r.getStockRestant() : r.getNouveauStock())
                    .orElse(0);
            total += stock;
        }
        return total;
    }

    private List<Long> resoudreScope(AppUserDetails user, Long etablissementId) {
        if (etablissementId != null) {
            if (!user.peutAccederEtablissement(etablissementId)) {
                throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
            }
            return List.of(etablissementId);
        }
        // Vue consolidée : le propriétaire voit tous les établissements.
        return etablissementRepository.findAll().stream().map(e -> e.getId()).toList();
    }
}
