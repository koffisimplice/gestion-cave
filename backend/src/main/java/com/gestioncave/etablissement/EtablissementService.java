package com.gestioncave.etablissement;

import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.dto.EtablissementRequest;
import com.gestioncave.etablissement.dto.EtablissementResponse;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class EtablissementService {

    private final EtablissementRepository etablissementRepository;

    public EtablissementService(EtablissementRepository etablissementRepository) {
        this.etablissementRepository = etablissementRepository;
    }

    /**
     * Établissements visibles par l'utilisateur : tous les actifs pour le propriétaire,
     * uniquement ceux rattachés pour un gérant.
     */
    @Transactional(readOnly = true)
    public List<EtablissementResponse> lister(AppUserDetails user) {
        List<Etablissement> etablissements = user.isProprietaire()
                ? etablissementRepository.findByActifTrue()
                : etablissementRepository.findAllById(user.getEtablissementIds()).stream()
                        .filter(Etablissement::isActif)
                        .toList();

        return etablissements.stream()
                .sorted(Comparator.comparing(Etablissement::getNom, String.CASE_INSENSITIVE_ORDER))
                .map(EtablissementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EtablissementResponse obtenir(Long id, AppUserDetails user) {
        Etablissement e = getOrThrow(id);
        if (!user.peutAccederEtablissement(id)) {
            throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
        }
        return EtablissementResponse.from(e);
    }

    public EtablissementResponse creer(EtablissementRequest req) {
        Etablissement e = Etablissement.builder()
                .nom(req.nom().trim())
                .adresse(req.adresse())
                .responsable(req.responsable())
                .actif(true)
                .build();
        return EtablissementResponse.from(etablissementRepository.save(e));
    }

    public EtablissementResponse modifier(Long id, EtablissementRequest req) {
        Etablissement e = getOrThrow(id);
        e.setNom(req.nom().trim());
        e.setAdresse(req.adresse());
        e.setResponsable(req.responsable());
        return EtablissementResponse.from(etablissementRepository.save(e));
    }

    /** Désactivation (soft delete) pour préserver l'historique lié. */
    public void desactiver(Long id) {
        Etablissement e = getOrThrow(id);
        if (!e.isActif()) {
            throw new BusinessException("Cet établissement est déjà désactivé.");
        }
        e.setActif(false);
        etablissementRepository.save(e);
    }

    private Etablissement getOrThrow(Long id) {
        return etablissementRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + id));
    }
}
