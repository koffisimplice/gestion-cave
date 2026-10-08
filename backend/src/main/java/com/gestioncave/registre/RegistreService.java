package com.gestioncave.registre;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.dto.MajLigneRequest;
import com.gestioncave.registre.dto.PointJournalierResponse;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class RegistreService {

    private final RegistreJournalierRepository registreRepository;
    private final BoissonRepository boissonRepository;
    private final EtablissementRepository etablissementRepository;
    private final CalculService calcul;

    public RegistreService(RegistreJournalierRepository registreRepository,
                           BoissonRepository boissonRepository,
                           EtablissementRepository etablissementRepository,
                           CalculService calcul) {
        this.registreRepository = registreRepository;
        this.boissonRepository = boissonRepository;
        this.etablissementRepository = etablissementRepository;
        this.calcul = calcul;
    }

    /**
     * Renvoie le point du jour, en initialisant les lignes manquantes (une par boisson
     * active de l'établissement). L'ancien stock est repris automatiquement de la veille.
     */
    public PointJournalierResponse pointDuJour(AppUserDetails user, Long etablissementId, LocalDate date) {
        verifierAcces(user, etablissementId);
        Etablissement etablissement = etablissementRepository.findById(etablissementId)
                .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + etablissementId));

        List<RegistreJournalier> existantes = registreRepository
                .findByEtablissementIdAndDate(etablissementId, date);

        boolean journeeCloturee = !existantes.isEmpty()
                && existantes.stream().allMatch(r -> r.getStatut() == StatutRegistre.CLOTURE);

        // On n'ajoute de nouvelles lignes que si la journée n'est pas déjà clôturée.
        if (!journeeCloturee) {
            List<Boisson> boissons = boissonRepository.findActivesParEtablissement(etablissementId);
            for (Boisson boisson : boissons) {
                boolean dejaPresente = existantes.stream()
                        .anyMatch(r -> r.getBoisson().getId().equals(boisson.getId()));
                if (!dejaPresente) {
                    existantes.add(initialiserLigne(boisson, etablissement, date));
                }
            }
        }

        return PointJournalierResponse.from(etablissementId, date, existantes);
    }

    private RegistreJournalier initialiserLigne(Boisson boisson, Etablissement etablissement, LocalDate date) {
        int ancienStock = registreRepository
                .findFirstByBoissonIdAndEtablissementIdAndDateBeforeOrderByDateDesc(
                        boisson.getId(), etablissement.getId(), date)
                .map(prec -> prec.getStockRestant() != null ? prec.getStockRestant() : prec.getNouveauStock())
                .orElse(0);

        RegistreJournalier ligne = RegistreJournalier.builder()
                .boisson(boisson)
                .etablissement(etablissement)
                .date(date)
                .ancienStock(ancienStock)
                .commandeDuJour(0)
                .nouveauStock(calcul.nouveauStock(ancienStock, 0))
                .prixUnitaire(boisson.getPrixVenteUnitaire())
                .statut(StatutRegistre.OUVERT)
                .build();
        return registreRepository.save(ligne);
    }

    /** Saisie d'une ligne (commande du jour et/ou stock vendu), tant qu'elle est ouverte. */
    public PointJournalierResponse majLigne(AppUserDetails user, Long ligneId, MajLigneRequest req) {
        RegistreJournalier ligne = chargerLigneOuverte(user, ligneId);

        ligne.setCommandeDuJour(req.commandeDuJour());
        ligne.setNouveauStock(calcul.nouveauStock(ligne.getAncienStock(), req.commandeDuJour()));

        int perdu = req.stockPerdu() != null ? req.stockPerdu() : 0;
        ligne.setStockPerdu(perdu);
        String motif = req.motifPerte() != null ? req.motifPerte().trim() : null;
        ligne.setMotifPerte(perdu > 0 && motif != null && !motif.isEmpty() ? motif : null);

        appliquerVendu(ligne, req.stockVendu());
        registreRepository.save(ligne);

        return pointDuJour(user, ligne.getEtablissement().getId(), ligne.getDate());
    }

    /**
     * Enregistre une vente (modèle caisse) : incrémente le stock vendu de {@code quantite}
     * (bouton « +1 » du registre). Le stock restant est recalculé automatiquement.
     */
    public PointJournalierResponse enregistrerVente(AppUserDetails user, Long ligneId, int quantite) {
        if (quantite <= 0) {
            throw new BusinessException("La quantité vendue doit être supérieure à 0.");
        }
        RegistreJournalier ligne = chargerLigneOuverte(user, ligneId);

        int venduActuel = ligne.getStockVendu() != null ? ligne.getStockVendu() : 0;
        appliquerVendu(ligne, venduActuel + quantite);
        registreRepository.save(ligne);

        return pointDuJour(user, ligne.getEtablissement().getId(), ligne.getDate());
    }

    private RegistreJournalier chargerLigneOuverte(AppUserDetails user, Long ligneId) {
        RegistreJournalier ligne = registreRepository.findById(ligneId)
                .orElseThrow(() -> new NotFoundException("Ligne de registre introuvable : " + ligneId));
        verifierAcces(user, ligne.getEtablissement().getId());
        if (ligne.getStatut() == StatutRegistre.CLOTURE) {
            throw new BusinessException("Cette journée est clôturée : la saisie n'est plus possible.");
        }
        return ligne;
    }

    /**
     * Applique un stock vendu (ou null = pas encore saisi) et recalcule restant + P.V.T,
     * en tenant compte de la perte déjà positionnée sur la ligne. La perte réduit le stock
     * restant mais n'entre jamais dans le prix de vente total (hors chiffre d'affaires).
     */
    private void appliquerVendu(RegistreJournalier ligne, Integer vendu) {
        int perdu = ligne.getStockPerdu();
        if (vendu != null) {
            ligne.setStockVendu(vendu);
            ligne.setStockRestant(calcul.stockRestant(ligne.getNouveauStock(), vendu, perdu));
            ligne.setPrixVenteTotal(calcul.prixVenteTotal(vendu, ligne.getPrixUnitaire()));
        } else if (perdu > 0) {
            // Perte saisie sans vente encore renseignée : le restant reflète déjà la perte.
            ligne.setStockVendu(null);
            ligne.setStockRestant(calcul.stockRestant(ligne.getNouveauStock(), 0, perdu));
            ligne.setPrixVenteTotal(null);
        } else {
            ligne.setStockVendu(null);
            ligne.setStockRestant(null);
            ligne.setPrixVenteTotal(null);
        }
    }

    /**
     * « Arrêter le point » : verrouille la journée. Les boissons sans vente saisie sont
     * considérées comme non vendues (0). Le stock restant (= nouveau − vendu) devient
     * l'ancien stock du lendemain, repris automatiquement.
     */
    public PointJournalierResponse cloturer(AppUserDetails user, Long etablissementId, LocalDate date) {
        verifierAcces(user, etablissementId);

        List<RegistreJournalier> lignes = registreRepository
                .findByEtablissementIdAndDate(etablissementId, date);

        if (lignes.isEmpty()) {
            throw new BusinessException("Aucune ligne à clôturer pour cette journée.");
        }
        if (lignes.stream().allMatch(r -> r.getStatut() == StatutRegistre.CLOTURE)) {
            throw new BusinessException("Cette journée est déjà clôturée.");
        }

        Instant maintenant = Instant.now();
        for (RegistreJournalier r : lignes) {
            // Vente non saisie = aucune vente (0). Recalcul de sûreté avant verrouillage,
            // en tenant compte de la perte éventuelle.
            int vendu = r.getStockVendu() != null ? r.getStockVendu() : 0;
            r.setStockVendu(vendu);
            r.setStockRestant(calcul.stockRestant(r.getNouveauStock(), vendu, r.getStockPerdu()));
            r.setPrixVenteTotal(calcul.prixVenteTotal(vendu, r.getPrixUnitaire()));
            r.setStatut(StatutRegistre.CLOTURE);
            r.setClotureAt(maintenant);
        }
        registreRepository.saveAll(lignes);

        return PointJournalierResponse.from(etablissementId, date, lignes);
    }

    /**
     * Applique une entrée de stock (livraison/achat) : ajoute {@code bouteilles} à la commande
     * du jour de la ligne concernée, en créant la ligne si besoin. Le nouveau stock est recalculé,
     * ainsi que le vendu/PVT si un stock restant est déjà saisi.
     *
     * @throws BusinessException si la journée est déjà clôturée
     */
    public void appliquerEntreeStock(Long boissonId, Long etablissementId, LocalDate date, int bouteilles) {
        ajusterCommande(boissonId, etablissementId, date, bouteilles, true);
    }

    /**
     * Annule une entrée de stock précédemment appliquée (suppression d'un achat) : retranche
     * {@code bouteilles} de la commande du jour. Sans effet si la ligne n'existe plus.
     *
     * @throws BusinessException si la journée est déjà clôturée
     */
    public void annulerEntreeStock(Long boissonId, Long etablissementId, LocalDate date, int bouteilles) {
        ajusterCommande(boissonId, etablissementId, date, -bouteilles, false);
    }

    private void ajusterCommande(Long boissonId, Long etablissementId, LocalDate date,
                                 int delta, boolean creerSiAbsente) {
        RegistreJournalier ligne = registreRepository
                .findByBoissonIdAndEtablissementIdAndDate(boissonId, etablissementId, date)
                .orElse(null);

        if (ligne == null) {
            if (!creerSiAbsente) {
                return; // rien à annuler
            }
            Boisson boisson = boissonRepository.findById(boissonId)
                    .orElseThrow(() -> new NotFoundException("Boisson introuvable : " + boissonId));
            Etablissement etablissement = etablissementRepository.findById(etablissementId)
                    .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + etablissementId));
            ligne = initialiserLigne(boisson, etablissement, date);
        }

        if (ligne.getStatut() == StatutRegistre.CLOTURE) {
            throw new BusinessException(
                    "La journée du " + date + " est clôturée : le stock ne peut plus être modifié.");
        }

        int nouvelleCommande = Math.max(0, ligne.getCommandeDuJour() + delta);
        ligne.setCommandeDuJour(nouvelleCommande);
        ligne.setNouveauStock(calcul.nouveauStock(ligne.getAncienStock(), nouvelleCommande));

        // Recalcule le stock restant (vendu et/ou perte) sur le nouveau stock.
        appliquerVendu(ligne, ligne.getStockVendu());

        registreRepository.save(ligne);
    }

    private void verifierAcces(AppUserDetails user, Long etablissementId) {
        if (!user.peutAccederEtablissement(etablissementId)) {
            throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
        }
    }
}
