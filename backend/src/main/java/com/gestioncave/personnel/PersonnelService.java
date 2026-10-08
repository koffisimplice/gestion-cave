package com.gestioncave.personnel;

import com.gestioncave.audit.AuditService;
import com.gestioncave.charge.Charge;
import com.gestioncave.charge.CategorieCharge;
import com.gestioncave.charge.ChargeRepository;
import com.gestioncave.charge.Periodicite;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.personnel.dto.EmployeRequest;
import com.gestioncave.personnel.dto.EmployeResponse;
import com.gestioncave.personnel.dto.LignePaieResponse;
import com.gestioncave.personnel.dto.PaiementRequest;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Module Personnel & Paie (propriétaire uniquement). Gère les fiches employés rattachées
 * à un maquis et le paiement mensuel des salaires. Chaque paiement génère une charge
 * (catégorie SALAIRE) sur le mois concerné, afin que le bénéfice net reflète le coût réel
 * du personnel. L'annulation d'un paiement supprime la charge associée.
 */
@Service
@Transactional
public class PersonnelService {

    private final EmployeRepository employeRepository;
    private final PaiementSalaireRepository paiementRepository;
    private final EtablissementRepository etablissementRepository;
    private final ChargeRepository chargeRepository;
    private final AuditService auditService;

    public PersonnelService(EmployeRepository employeRepository,
                            PaiementSalaireRepository paiementRepository,
                            EtablissementRepository etablissementRepository,
                            ChargeRepository chargeRepository,
                            AuditService auditService) {
        this.employeRepository = employeRepository;
        this.paiementRepository = paiementRepository;
        this.etablissementRepository = etablissementRepository;
        this.chargeRepository = chargeRepository;
        this.auditService = auditService;
    }

    // ----- Employés -----------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EmployeResponse> listerEmployes(AppUserDetails user, Long etablissementId) {
        List<Employe> employes;
        if (etablissementId != null) {
            verifierAcces(user, etablissementId);
            employes = employeRepository.findByEtablissementIdOrderByNomAsc(etablissementId);
        } else {
            List<Long> ids = etablissementRepository.findAll().stream().map(Etablissement::getId).toList();
            employes = ids.isEmpty()
                    ? List.of()
                    : employeRepository.findByEtablissementIdInOrderByNomAsc(ids);
        }
        return employes.stream().map(EmployeResponse::from).toList();
    }

    public EmployeResponse creerEmploye(AppUserDetails user, EmployeRequest req) {
        verifierAcces(user, req.etablissementId());
        Etablissement etablissement = etablissementRepository.findById(req.etablissementId())
                .orElseThrow(() -> new NotFoundException(
                        "Établissement introuvable : " + req.etablissementId()));
        String nom = req.nom().trim();
        if (employeRepository.existsByEtablissementIdAndNomIgnoreCase(req.etablissementId(), nom)) {
            throw new BusinessException("Un employé de ce maquis porte déjà ce nom.");
        }
        Employe e = Employe.builder()
                .etablissement(etablissement)
                .nom(nom)
                .poste(vide(req.poste()))
                .salaireMensuel(req.salaireMensuel())
                .telephone(vide(req.telephone()))
                .dateEmbauche(req.dateEmbauche())
                .actif(true)
                .build();
        e = employeRepository.save(e);
        auditService.enregistrer("EMPLOYE_CREE", e.getNom(), e.getEtablissement().getNom());
        return EmployeResponse.from(e);
    }

    public EmployeResponse modifierEmploye(AppUserDetails user, Long id, EmployeRequest req) {
        Employe e = getEmployeOrThrow(id);
        verifierAcces(user, e.getEtablissement().getId());
        verifierAcces(user, req.etablissementId());

        if (!e.getEtablissement().getId().equals(req.etablissementId())) {
            Etablissement nouvel = etablissementRepository.findById(req.etablissementId())
                    .orElseThrow(() -> new NotFoundException(
                            "Établissement introuvable : " + req.etablissementId()));
            e.setEtablissement(nouvel);
        }
        String nom = req.nom().trim();
        if (employeRepository.existsByEtablissementIdAndNomIgnoreCaseAndIdNot(
                req.etablissementId(), nom, id)) {
            throw new BusinessException("Un autre employé de ce maquis porte déjà ce nom.");
        }
        e.setNom(nom);
        e.setPoste(vide(req.poste()));
        e.setSalaireMensuel(req.salaireMensuel());
        e.setTelephone(vide(req.telephone()));
        e.setDateEmbauche(req.dateEmbauche());
        e = employeRepository.save(e);
        auditService.enregistrer("EMPLOYE_MODIFIE", e.getNom(), e.getEtablissement().getNom());
        return EmployeResponse.from(e);
    }

    /**
     * Supprime l'employé s'il n'a aucun paiement enregistré ; sinon on le désactive
     * (préservation de l'historique des salaires versés et des charges associées).
     */
    public void supprimerEmploye(AppUserDetails user, Long id) {
        Employe e = getEmployeOrThrow(id);
        verifierAcces(user, e.getEtablissement().getId());
        if (paiementRepository.existsByEmployeId(id)) {
            e.setActif(false);
            employeRepository.save(e);
            auditService.enregistrer("EMPLOYE_DESACTIVE", e.getNom(),
                    "Conservé car des salaires y sont rattachés.");
        } else {
            employeRepository.delete(e);
            auditService.enregistrer("EMPLOYE_SUPPRIME", e.getNom(), null);
        }
    }

    // ----- Paie ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<LignePaieResponse> etatPaie(AppUserDetails user, Long etablissementId,
                                            int annee, int mois) {
        verifierMois(mois);
        List<Employe> employes;
        if (etablissementId != null) {
            verifierAcces(user, etablissementId);
            employes = employeRepository.findByEtablissementIdOrderByNomAsc(etablissementId);
        } else {
            List<Long> ids = etablissementRepository.findAll().stream().map(Etablissement::getId).toList();
            employes = ids.isEmpty()
                    ? List.of()
                    : employeRepository.findByEtablissementIdInOrderByNomAsc(ids);
        }
        return employes.stream()
                .filter(Employe::isActif)
                .map(e -> LignePaieResponse.from(e,
                        paiementRepository.findByEmployeIdAndAnneeAndMois(e.getId(), annee, mois)
                                .orElse(null)))
                .toList();
    }

    /** Marque un salaire comme payé : crée le paiement et la charge de salaire liée. */
    public LignePaieResponse payer(AppUserDetails user, PaiementRequest req) {
        verifierMois(req.mois());
        Employe e = getEmployeOrThrow(req.employeId());
        verifierAcces(user, e.getEtablissement().getId());

        paiementRepository.findByEmployeIdAndAnneeAndMois(e.getId(), req.annee(), req.mois())
                .ifPresent(p -> {
                    throw new BusinessException("Le salaire de cet employé est déjà payé pour ce mois.");
                });

        Charge charge = Charge.builder()
                .etablissement(e.getEtablissement())
                .categorie(CategorieCharge.SALAIRE)
                .libelle("Salaire — " + e.getNom())
                .montant(req.montant())
                .periodicite(Periodicite.MENSUELLE)
                .annee(req.annee())
                .mois(req.mois())
                .build();
        charge = chargeRepository.save(charge);

        PaiementSalaire p = PaiementSalaire.builder()
                .employe(e)
                .annee(req.annee())
                .mois(req.mois())
                .montant(req.montant())
                .datePaiement(req.datePaiement())
                .charge(charge)
                .build();
        p = paiementRepository.save(p);
        auditService.enregistrer("SALAIRE_PAYE", e.getNom(),
                "Mois " + req.mois() + "/" + req.annee() + " — " + req.montant());
        return LignePaieResponse.from(e, p);
    }

    /** Annule un paiement : supprime la charge de salaire associée. */
    public void annulerPaiement(AppUserDetails user, Long paiementId) {
        PaiementSalaire p = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new NotFoundException("Paiement introuvable : " + paiementId));
        verifierAcces(user, p.getEmploye().getEtablissement().getId());
        Charge charge = p.getCharge();
        String nom = p.getEmploye().getNom();
        int mois = p.getMois();
        int annee = p.getAnnee();
        paiementRepository.delete(p);
        if (charge != null) {
            chargeRepository.delete(charge);
        }
        auditService.enregistrer("SALAIRE_ANNULE", nom, "Mois " + mois + "/" + annee);
    }

    // ----- Utilitaires --------------------------------------------------------

    private Employe getEmployeOrThrow(Long id) {
        return employeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Employé introuvable : " + id));
    }

    private void verifierAcces(AppUserDetails user, Long etablissementId) {
        if (!user.peutAccederEtablissement(etablissementId)) {
            throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
        }
    }

    private void verifierMois(int mois) {
        if (mois < 1 || mois > 12) {
            throw new BusinessException("Le mois doit être compris entre 1 et 12.");
        }
    }

    private String vide(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
