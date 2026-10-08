package com.gestioncave.tableaubord;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.charge.RentabiliteService;
import com.gestioncave.charge.dto.RentabiliteResponse;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.RegistreJournalierRepository;
import com.gestioncave.security.AppUserDetails;
import com.gestioncave.tableaubord.dto.BoissonVendueResume;
import com.gestioncave.tableaubord.dto.TableauBordResponse;
import com.gestioncave.tableaubord.dto.VenteResume;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Tableau de bord (module 8) : synthèse opérationnelle (stock, ventes, alertes,
 * meilleures ventes) pour tous les rôles, plus la synthèse financière du mois
 * réservée au propriétaire.
 */
@Service
@Transactional(readOnly = true)
public class TableauBordService {

    private final RegistreJournalierRepository registreRepository;
    private final BoissonRepository boissonRepository;
    private final EtablissementRepository etablissementRepository;
    private final RentabiliteService rentabiliteService;

    public TableauBordService(RegistreJournalierRepository registreRepository,
                              BoissonRepository boissonRepository,
                              EtablissementRepository etablissementRepository,
                              RentabiliteService rentabiliteService) {
        this.registreRepository = registreRepository;
        this.boissonRepository = boissonRepository;
        this.etablissementRepository = etablissementRepository;
        this.rentabiliteService = rentabiliteService;
    }

    public TableauBordResponse synthese(AppUserDetails user, Long etablissementId, LocalDate date) {
        LocalDate ref = date != null ? date : LocalDate.now();
        List<Long> scope = resoudreScope(user, etablissementId);

        LocalDate debutMois = ref.withDayOfMonth(1);
        LocalDate finMois = debutMois.plusMonths(1).minusDays(1);

        List<RegistreJournalier> lignesMois = scope.isEmpty()
                ? List.of()
                : (etablissementId != null
                    ? registreRepository.findByEtablissementIdAndDateBetween(etablissementId, debutMois, finMois)
                    : registreRepository.findByEtablissementIdInAndDateBetween(scope, debutMois, finMois));

        VenteResume ventesJour = agregerVentes(lignesMois.stream().filter(r -> r.getDate().equals(ref)).toList());
        VenteResume ventesMois = agregerVentes(lignesMois);

        // Meilleures ventes du mois (top 5 par quantité vendue).
        Map<Long, int[]> qteParBoisson = new java.util.HashMap<>();
        Map<Long, BigDecimal> caParBoisson = new java.util.HashMap<>();
        Map<Long, String> nomParBoisson = new java.util.HashMap<>();
        for (RegistreJournalier r : lignesMois) {
            if (r.getStockVendu() == null || r.getStockVendu() == 0) {
                continue;
            }
            Long bid = r.getBoisson().getId();
            qteParBoisson.computeIfAbsent(bid, k -> new int[1])[0] += r.getStockVendu();
            caParBoisson.merge(bid,
                    r.getPrixVenteTotal() != null ? r.getPrixVenteTotal() : BigDecimal.ZERO,
                    BigDecimal::add);
            nomParBoisson.putIfAbsent(bid, r.getBoisson().getDesignation());
        }
        List<BoissonVendueResume> meilleures = qteParBoisson.entrySet().stream()
                .map(e -> new BoissonVendueResume(e.getKey(), nomParBoisson.get(e.getKey()),
                        e.getValue()[0], caParBoisson.getOrDefault(e.getKey(), BigDecimal.ZERO)))
                .sorted(Comparator.comparingInt(BoissonVendueResume::quantiteVendue).reversed())
                .limit(5)
                .toList();

        // Stock actuel + alertes par boisson du périmètre.
        List<Boisson> boissons = scope.isEmpty()
                ? List.of()
                : boissonRepository.findActivesParEtablissements(scope);
        int stockTotal = 0;
        int nbStockBas = 0;
        int nbRuptures = 0;
        for (Boisson b : boissons) {
            int stock = stockActuel(b.getId(), scope, ref);
            stockTotal += stock;
            if (stock == 0) {
                nbRuptures++;
            } else if (b.getSeuilAlerte() > 0 && stock <= b.getSeuilAlerte()) {
                nbStockBas++;
            }
        }

        // Financier : propriétaire uniquement.
        BigDecimal beneficeBrut = null;
        BigDecimal totalCharges = null;
        BigDecimal beneficeNet = null;
        Boolean beneficiaire = null;
        if (user.isProprietaire()) {
            RentabiliteResponse rent = rentabiliteService.rentabilite(
                    user, etablissementId, ref.getYear(), ref.getMonthValue());
            beneficeBrut = rent.beneficeBrut();
            totalCharges = rent.totalCharges();
            beneficeNet = rent.beneficeNet();
            beneficiaire = rent.beneficiaire();
        }

        return new TableauBordResponse(
                etablissementId, ref, ref.getYear(), ref.getMonthValue(),
                ventesJour, ventesMois, stockTotal, boissons.size(), nbStockBas, nbRuptures, meilleures,
                beneficeBrut, totalCharges, beneficeNet, beneficiaire);
    }

    private VenteResume agregerVentes(List<RegistreJournalier> lignes) {
        int qte = 0;
        BigDecimal ca = BigDecimal.ZERO;
        for (RegistreJournalier r : lignes) {
            if (r.getStockVendu() != null) {
                qte += r.getStockVendu();
            }
            if (r.getPrixVenteTotal() != null) {
                ca = ca.add(r.getPrixVenteTotal());
            }
        }
        return new VenteResume(qte, ca);
    }

    private int stockActuel(Long boissonId, List<Long> scope, LocalDate ref) {
        int total = 0;
        for (Long etabId : scope) {
            total += registreRepository
                    .findFirstByBoissonIdAndEtablissementIdAndDateLessThanEqualOrderByDateDesc(
                            boissonId, etabId, ref)
                    .map(r -> r.getStockRestant() != null ? r.getStockRestant() : r.getNouveauStock())
                    .orElse(0);
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
        if (user.isProprietaire()) {
            return etablissementRepository.findAll().stream().map(Etablissement::getId).toList();
        }
        return user.getEtablissementIds().stream().toList();
    }

    /**
     * Ventes quotidiennes (quantité + CA) sur les {@code jours} derniers jours,
     * pour la courbe de tendance du tableau de bord. Chaque jour de la période
     * est présent, même sans vente (valeurs à zéro), pour une courbe continue.
     */
    public List<com.gestioncave.tableaubord.dto.PointVenteJour> tendance(
            AppUserDetails user, Long etablissementId, int jours) {
        int n = Math.min(Math.max(jours, 1), 180); // borne de sécurité
        LocalDate fin = LocalDate.now();
        LocalDate debut = fin.minusDays(n - 1L);

        Map<LocalDate, int[]> qteParJour = new java.util.HashMap<>();
        Map<LocalDate, BigDecimal> caParJour = new java.util.HashMap<>();

        List<Long> scope = resoudreScope(user, etablissementId);
        if (!scope.isEmpty()) {
            List<RegistreJournalier> lignes = (etablissementId != null)
                    ? registreRepository.findByEtablissementIdAndDateBetween(etablissementId, debut, fin)
                    : registreRepository.findByEtablissementIdInAndDateBetween(scope, debut, fin);
            for (RegistreJournalier r : lignes) {
                if (r.getStockVendu() != null && r.getStockVendu() > 0) {
                    qteParJour.computeIfAbsent(r.getDate(), k -> new int[1])[0] += r.getStockVendu();
                }
                if (r.getPrixVenteTotal() != null) {
                    caParJour.merge(r.getDate(), r.getPrixVenteTotal(), BigDecimal::add);
                }
            }
        }

        List<com.gestioncave.tableaubord.dto.PointVenteJour> points = new java.util.ArrayList<>(n);
        for (LocalDate d = debut; !d.isAfter(fin); d = d.plusDays(1)) {
            int qte = qteParJour.containsKey(d) ? qteParJour.get(d)[0] : 0;
            BigDecimal ca = caParJour.getOrDefault(d, BigDecimal.ZERO);
            points.add(new com.gestioncave.tableaubord.dto.PointVenteJour(d, qte, ca));
        }
        return points;
    }

    /** Historique du registre, filtrable par période, établissement et boisson. */
    public List<com.gestioncave.tableaubord.dto.LigneHistoriqueResponse> historique(
            AppUserDetails user, Long etablissementId, LocalDate debut, LocalDate fin, Long boissonId) {
        if (debut == null || fin == null) {
            throw new com.gestioncave.common.BusinessException("Les dates de début et de fin sont obligatoires.");
        }
        if (fin.isBefore(debut)) {
            throw new com.gestioncave.common.BusinessException(
                    "La date de fin ne peut pas précéder la date de début.");
        }
        List<Long> scope = resoudreScope(user, etablissementId);
        if (scope.isEmpty()) {
            return List.of();
        }
        List<RegistreJournalier> lignes = (etablissementId != null)
                ? registreRepository.findByEtablissementIdAndDateBetween(etablissementId, debut, fin)
                : registreRepository.findByEtablissementIdInAndDateBetween(scope, debut, fin);

        return lignes.stream()
                .filter(r -> boissonId == null || r.getBoisson().getId().equals(boissonId))
                .sorted(Comparator.comparing(RegistreJournalier::getDate).reversed()
                        .thenComparing(r -> r.getBoisson().getDesignation(), String.CASE_INSENSITIVE_ORDER))
                .map(com.gestioncave.tableaubord.dto.LigneHistoriqueResponse::from)
                .collect(Collectors.toList());
    }
}
