package com.gestioncave.boisson;

import com.gestioncave.boisson.dto.BoissonRequest;
import com.gestioncave.boisson.dto.BoissonResponse;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class BoissonService {

    private final BoissonRepository boissonRepository;
    private final EtablissementRepository etablissementRepository;
    private final CalculService calcul;

    public BoissonService(BoissonRepository boissonRepository,
                          EtablissementRepository etablissementRepository,
                          CalculService calcul) {
        this.boissonRepository = boissonRepository;
        this.etablissementRepository = etablissementRepository;
        this.calcul = calcul;
    }

    @Transactional(readOnly = true)
    public List<BoissonResponse> lister(AppUserDetails user, Long etablissementId) {
        List<Boisson> boissons;

        if (etablissementId != null) {
            if (!user.peutAccederEtablissement(etablissementId)) {
                throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
            }
            boissons = boissonRepository.findActivesParEtablissement(etablissementId);
        } else if (user.isProprietaire()) {
            boissons = boissonRepository.findByActifTrue();
        } else {
            List<Long> ids = user.getEtablissementIds().stream().toList();
            boissons = ids.isEmpty() ? List.of() : boissonRepository.findActivesParEtablissements(ids);
        }

        boolean couts = user.isProprietaire();
        return boissons.stream()
                .sorted(Comparator.comparing(Boisson::getDesignation, String.CASE_INSENSITIVE_ORDER))
                .map(b -> BoissonResponse.from(b, couts, calcul))
                .toList();
    }

    @Transactional(readOnly = true)
    public BoissonResponse obtenir(Long id, AppUserDetails user) {
        Boisson b = getOrThrow(id);
        if (!user.isProprietaire()
                && b.getEtablissements().stream()
                        .noneMatch(e -> user.getEtablissementIds().contains(e.getId()))) {
            throw new AccessDeniedException("Vous n'avez pas accès à cette boisson.");
        }
        return BoissonResponse.from(b, user.isProprietaire(), calcul);
    }

    public BoissonResponse creer(BoissonRequest req) {
        Boisson b = Boisson.builder()
                .designation(req.designation().trim())
                .typeConditionnement(req.typeConditionnement() != null
                        ? req.typeConditionnement()
                        : TypeConditionnement.CASIER)
                .bouteillesParConditionnement(req.bouteillesParConditionnement())
                .prixAchatCasier(req.prixAchatCasier())
                .prixVenteUnitaire(req.prixVenteUnitaire())
                .seuilAlerte(req.seuilAlerte())
                .categorie(req.categorie())
                .photoUrl(req.photoUrl())
                .actif(true)
                .etablissements(resoudreEtablissements(req.etablissementIds()))
                .build();
        return BoissonResponse.from(boissonRepository.save(b), true, calcul);
    }

    public BoissonResponse modifier(Long id, BoissonRequest req) {
        Boisson b = getOrThrow(id);
        b.setDesignation(req.designation().trim());
        b.setTypeConditionnement(req.typeConditionnement() != null
                ? req.typeConditionnement()
                : TypeConditionnement.CASIER);
        b.setBouteillesParConditionnement(req.bouteillesParConditionnement());
        b.setPrixAchatCasier(req.prixAchatCasier());
        b.setPrixVenteUnitaire(req.prixVenteUnitaire());
        b.setSeuilAlerte(req.seuilAlerte());
        b.setCategorie(req.categorie());
        b.setPhotoUrl(req.photoUrl());
        b.setEtablissements(resoudreEtablissements(req.etablissementIds()));
        return BoissonResponse.from(boissonRepository.save(b), true, calcul);
    }

    public void desactiver(Long id) {
        Boisson b = getOrThrow(id);
        if (!b.isActif()) {
            throw new BusinessException("Cette boisson est déjà désactivée.");
        }
        b.setActif(false);
        boissonRepository.save(b);
    }

    private Set<Etablissement> resoudreEtablissements(Set<Long> ids) {
        Set<Etablissement> resultat = new HashSet<>();
        for (Long id : ids) {
            Etablissement e = etablissementRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + id));
            resultat.add(e);
        }
        return resultat;
    }

    private Boisson getOrThrow(Long id) {
        return boissonRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Boisson introuvable : " + id));
    }
}
