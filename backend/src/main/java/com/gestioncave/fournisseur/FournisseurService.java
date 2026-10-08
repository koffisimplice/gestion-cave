package com.gestioncave.fournisseur;

import com.gestioncave.audit.AuditService;
import com.gestioncave.commande.CommandeFournisseurRepository;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.fournisseur.dto.FournisseurRequest;
import com.gestioncave.fournisseur.dto.FournisseurResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Gestion du répertoire des fournisseurs. La création/modification/suppression est
 * réservée au propriétaire ; la liste reste lisible par tous (pour sélectionner un
 * fournisseur lors d'un achat). Les statistiques d'achats (nombre, montant) enrichissent
 * la vue ; le montant n'est exposé qu'au propriétaire au niveau du contrôleur.
 */
@Service
@Transactional
public class FournisseurService {

    private final FournisseurRepository fournisseurRepository;
    private final CommandeFournisseurRepository commandeRepository;
    private final AuditService auditService;

    public FournisseurService(FournisseurRepository fournisseurRepository,
                              CommandeFournisseurRepository commandeRepository,
                              AuditService auditService) {
        this.fournisseurRepository = fournisseurRepository;
        this.commandeRepository = commandeRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<FournisseurResponse> lister(boolean inclureCouts) {
        return fournisseurRepository.findAllByOrderByNomAsc().stream()
                .map(f -> toResponse(f, inclureCouts))
                .toList();
    }

    @Transactional(readOnly = true)
    public FournisseurResponse obtenir(Long id, boolean inclureCouts) {
        return toResponse(getOrThrow(id), inclureCouts);
    }

    public FournisseurResponse creer(FournisseurRequest req) {
        String nom = req.nom().trim();
        if (fournisseurRepository.existsByNomIgnoreCase(nom)) {
            throw new BusinessException("Un fournisseur avec ce nom existe déjà.");
        }
        Fournisseur f = Fournisseur.builder()
                .nom(nom)
                .telephone(vide(req.telephone()))
                .contact(vide(req.contact()))
                .adresse(vide(req.adresse()))
                .notes(vide(req.notes()))
                .actif(true)
                .build();
        f = fournisseurRepository.save(f);
        auditService.enregistrer("FOURNISSEUR_CREE", f.getNom(), null);
        return toResponse(f, true);
    }

    public FournisseurResponse modifier(Long id, FournisseurRequest req) {
        Fournisseur f = getOrThrow(id);
        String nom = req.nom().trim();
        if (fournisseurRepository.existsByNomIgnoreCaseAndIdNot(nom, id)) {
            throw new BusinessException("Un autre fournisseur utilise déjà ce nom.");
        }
        f.setNom(nom);
        f.setTelephone(vide(req.telephone()));
        f.setContact(vide(req.contact()));
        f.setAdresse(vide(req.adresse()));
        f.setNotes(vide(req.notes()));
        f = fournisseurRepository.save(f);
        auditService.enregistrer("FOURNISSEUR_MODIFIE", f.getNom(), null);
        return toResponse(f, true);
    }

    /**
     * Supprime un fournisseur s'il n'est référencé par aucun achat ; sinon on le désactive
     * (préservation de l'historique des achats).
     */
    public void supprimer(Long id) {
        Fournisseur f = getOrThrow(id);
        if (commandeRepository.existsByFournisseurRefId(id)) {
            f.setActif(false);
            fournisseurRepository.save(f);
            auditService.enregistrer("FOURNISSEUR_DESACTIVE", f.getNom(),
                    "Conservé car des achats y sont rattachés.");
        } else {
            fournisseurRepository.delete(f);
            auditService.enregistrer("FOURNISSEUR_SUPPRIME", f.getNom(), null);
        }
    }

    private FournisseurResponse toResponse(Fournisseur f, boolean inclureCouts) {
        long nb = commandeRepository.countByFournisseurRefId(f.getId());
        BigDecimal montant = inclureCouts
                ? commandeRepository.montantTotalParFournisseur(f.getId())
                : null;
        return FournisseurResponse.from(f, nb, montant);
    }

    private Fournisseur getOrThrow(Long id) {
        return fournisseurRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Fournisseur introuvable : " + id));
    }

    private String vide(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
