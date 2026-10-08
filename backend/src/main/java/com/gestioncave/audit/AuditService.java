package com.gestioncave.audit;

import com.gestioncave.audit.dto.JournalAuditResponse;
import com.gestioncave.security.AppUserDetails;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Journal d'audit : enregistre les actions sensibles et permet leur consultation
 * (propriétaire uniquement, via le contrôleur). L'écriture participe à la
 * transaction courante : si l'opération métier échoue, l'entrée n'est pas conservée.
 */
@Service
public class AuditService {

    private static final int LIMITE_MAX = 500;

    private final JournalAuditRepository repository;

    public AuditService(JournalAuditRepository repository) {
        this.repository = repository;
    }

    /** Enregistre une action en déduisant l'acteur du contexte de sécurité courant. */
    @Transactional
    public void enregistrer(String action, String cible, String details) {
        String acteur = "système";
        Long uid = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserDetails principal) {
            acteur = principal.getUtilisateur().getEmail();
            uid = principal.getUtilisateur().getId();
        }
        enregistrer(acteur, uid, action, cible, details);
    }

    /** Enregistre une action en précisant explicitement l'acteur (ex. flux de connexion). */
    @Transactional
    public void enregistrer(String acteur, Long utilisateurId, String action, String cible, String details) {
        repository.save(JournalAudit.builder()
                .dateHeure(Instant.now())
                .utilisateurId(utilisateurId)
                .acteur(acteur != null && !acteur.isBlank() ? acteur : "inconnu")
                .action(action)
                .cible(tronquer(cible, 255))
                .details(tronquer(details, 500))
                .build());
    }

    @Transactional(readOnly = true)
    public List<JournalAuditResponse> lister(String action, int limite) {
        int taille = Math.min(Math.max(limite, 1), LIMITE_MAX);
        PageRequest page = PageRequest.of(0, taille);
        List<JournalAudit> entrees = (action != null && !action.isBlank())
                ? repository.findByActionOrderByDateHeureDesc(action, page)
                : repository.findAllByOrderByDateHeureDesc(page);
        return entrees.stream().map(JournalAuditResponse::from).toList();
    }

    private String tronquer(String v, int max) {
        if (v == null) {
            return null;
        }
        return v.length() <= max ? v : v.substring(0, max);
    }
}
