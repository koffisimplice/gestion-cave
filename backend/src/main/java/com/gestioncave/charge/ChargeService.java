package com.gestioncave.charge;

import com.gestioncave.charge.dto.ChargeRequest;
import com.gestioncave.charge.dto.ChargeResponse;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ChargeService {

    private final ChargeRepository chargeRepository;
    private final EtablissementRepository etablissementRepository;

    public ChargeService(ChargeRepository chargeRepository,
                         EtablissementRepository etablissementRepository) {
        this.chargeRepository = chargeRepository;
        this.etablissementRepository = etablissementRepository;
    }

    @Transactional(readOnly = true)
    public List<ChargeResponse> lister(AppUserDetails user, Long etablissementId, int annee, int mois) {
        List<Charge> charges;
        if (etablissementId != null) {
            verifierAcces(user, etablissementId);
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
        return charges.stream().map(ChargeResponse::from).toList();
    }

    public ChargeResponse creer(AppUserDetails user, ChargeRequest req) {
        if (req.categorie() == CategorieCharge.SALAIRE) {
            throw new BusinessException(
                    "Les salaires se saisissent depuis « Personnel & Paie », pas ici.");
        }
        verifierAcces(user, req.etablissementId());
        Etablissement etablissement = etablissementRepository.findById(req.etablissementId())
                .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + req.etablissementId()));

        Charge charge = Charge.builder()
                .etablissement(etablissement)
                .categorie(req.categorie())
                .libelle(req.libelle().trim())
                .montant(req.montant())
                .periodicite(req.periodicite())
                .annee(req.annee())
                .mois(req.mois())
                .build();
        return ChargeResponse.from(chargeRepository.save(charge));
    }

    public ChargeResponse modifier(AppUserDetails user, Long id, ChargeRequest req) {
        Charge charge = getOrThrow(id);
        verifierGeree(charge);
        verifierAcces(user, charge.getEtablissement().getId());
        verifierAcces(user, req.etablissementId());

        if (!charge.getEtablissement().getId().equals(req.etablissementId())) {
            Etablissement nouvel = etablissementRepository.findById(req.etablissementId())
                    .orElseThrow(() -> new NotFoundException(
                            "Établissement introuvable : " + req.etablissementId()));
            charge.setEtablissement(nouvel);
        }
        charge.setCategorie(req.categorie());
        charge.setLibelle(req.libelle().trim());
        charge.setMontant(req.montant());
        charge.setPeriodicite(req.periodicite());
        charge.setAnnee(req.annee());
        charge.setMois(req.mois());
        return ChargeResponse.from(chargeRepository.save(charge));
    }

    public void supprimer(AppUserDetails user, Long id) {
        Charge charge = getOrThrow(id);
        verifierGeree(charge);
        verifierAcces(user, charge.getEtablissement().getId());
        chargeRepository.delete(charge);
    }

    /** Les charges de salaire sont pilotées par le module Personnel & Paie, pas éditables ici. */
    private void verifierGeree(Charge charge) {
        if (charge.getCategorie() == CategorieCharge.SALAIRE) {
            throw new BusinessException(
                    "Cette charge de salaire est gérée depuis « Personnel & Paie ». "
                    + "Modifiez ou annulez le paiement depuis cette page.");
        }
    }

    private Charge getOrThrow(Long id) {
        return chargeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Charge introuvable : " + id));
    }

    private void verifierAcces(AppUserDetails user, Long etablissementId) {
        if (!user.peutAccederEtablissement(etablissementId)) {
            throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
        }
    }
}
