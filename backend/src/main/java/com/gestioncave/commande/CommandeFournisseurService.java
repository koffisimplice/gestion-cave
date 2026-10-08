package com.gestioncave.commande;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.calcul.CalculService;
import com.gestioncave.commande.dto.CommandeRequest;
import com.gestioncave.commande.dto.CommandeResponse;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.fournisseur.Fournisseur;
import com.gestioncave.fournisseur.FournisseurRepository;
import com.gestioncave.registre.RegistreService;
import com.gestioncave.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class CommandeFournisseurService {

    private final CommandeFournisseurRepository commandeRepository;
    private final BoissonRepository boissonRepository;
    private final FournisseurRepository fournisseurRepository;
    private final RegistreService registreService;
    private final CalculService calcul;

    public CommandeFournisseurService(CommandeFournisseurRepository commandeRepository,
                                      BoissonRepository boissonRepository,
                                      FournisseurRepository fournisseurRepository,
                                      RegistreService registreService,
                                      CalculService calcul) {
        this.commandeRepository = commandeRepository;
        this.boissonRepository = boissonRepository;
        this.fournisseurRepository = fournisseurRepository;
        this.registreService = registreService;
        this.calcul = calcul;
    }

    /**
     * Enregistre un achat, convertit les casiers en bouteilles et alimente automatiquement
     * la commande du jour du registre de l'établissement.
     */
    public CommandeResponse creer(AppUserDetails user, CommandeRequest req) {
        verifierAcces(user, req.etablissementId());

        Boisson boisson = boissonRepository.findById(req.boissonId())
                .orElseThrow(() -> new NotFoundException("Boisson introuvable : " + req.boissonId()));

        boolean disponible = boisson.getEtablissements().stream()
                .anyMatch(e -> e.getId().equals(req.etablissementId()));
        if (!disponible) {
            throw new BusinessException("Cette boisson n'est pas disponible dans ce maquis.");
        }

        LocalDate date = req.date() != null ? req.date() : LocalDate.now();
        if (date.isAfter(LocalDate.now())) {
            throw new BusinessException("La date d'un achat ne peut pas être dans le futur.");
        }

        // Le prix payé : seul le propriétaire peut le personnaliser ; sinon prix du catalogue.
        BigDecimal prixCasier = (user.isProprietaire() && req.prixAchatCasier() != null)
                ? req.prixAchatCasier()
                : boisson.getPrixAchatCasier();

        int bouteillesParCasier = boisson.getBouteillesParConditionnement();
        int bouteilles = calcul.bouteillesAchetees(req.nombreCasiers(), bouteillesParCasier);
        BigDecimal montant = calcul.montantAchat(prixCasier, req.nombreCasiers());

        // Fiche fournisseur sélectionnée (prioritaire) ; le nom texte sert de snapshot.
        Fournisseur fournisseurRef = null;
        String nomFournisseur = normaliser(req.fournisseur());
        if (req.fournisseurId() != null) {
            fournisseurRef = fournisseurRepository.findById(req.fournisseurId())
                    .orElseThrow(() -> new NotFoundException(
                            "Fournisseur introuvable : " + req.fournisseurId()));
            nomFournisseur = fournisseurRef.getNom();
        }

        CommandeFournisseur commande = CommandeFournisseur.builder()
                .boisson(boisson)
                .etablissement(boisson.getEtablissements().stream()
                        .filter(e -> e.getId().equals(req.etablissementId()))
                        .findFirst()
                        .orElseThrow())
                .date(date)
                .typeConditionnement(boisson.getTypeConditionnement())
                .nombreCasiers(req.nombreCasiers())
                .bouteillesParCasier(bouteillesParCasier)
                .bouteillesAjoutees(bouteilles)
                .fournisseur(nomFournisseur)
                .fournisseurRef(fournisseurRef)
                .prixAchatCasier(prixCasier)
                .montantTotal(montant)
                .build();

        // Alimente le registre AVANT de persister l'achat : si la journée est clôturée,
        // l'exception annule toute la transaction (aucun achat orphelin).
        registreService.appliquerEntreeStock(boisson.getId(), req.etablissementId(), date, bouteilles);

        commande = commandeRepository.save(commande);
        return CommandeResponse.from(commande, user.isProprietaire());
    }

    @Transactional(readOnly = true)
    public List<CommandeResponse> lister(AppUserDetails user, Long etablissementId) {
        List<CommandeFournisseur> commandes;

        if (etablissementId != null) {
            verifierAcces(user, etablissementId);
            commandes = commandeRepository.findByEtablissementIdOrderByDateDescIdDesc(etablissementId);
        } else if (user.isProprietaire()) {
            commandes = commandeRepository.findAllByOrderByDateDescIdDesc();
        } else {
            List<Long> ids = user.getEtablissementIds().stream().toList();
            commandes = ids.isEmpty()
                    ? List.of()
                    : commandeRepository.findByEtablissementIdInOrderByDateDescIdDesc(ids);
        }

        boolean couts = user.isProprietaire();
        return commandes.stream().map(c -> CommandeResponse.from(c, couts)).toList();
    }

    /**
     * Supprime un achat (correction d'erreur de saisie) et retranche du registre les
     * bouteilles qui avaient été ajoutées. Impossible si la journée concernée est clôturée.
     */
    public void supprimer(AppUserDetails user, Long id) {
        CommandeFournisseur commande = commandeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Achat introuvable : " + id));
        verifierAcces(user, commande.getEtablissement().getId());

        registreService.annulerEntreeStock(
                commande.getBoisson().getId(),
                commande.getEtablissement().getId(),
                commande.getDate(),
                commande.getBouteillesAjoutees());

        commandeRepository.delete(commande);
    }

    private String normaliser(String valeur) {
        if (valeur == null) {
            return null;
        }
        String t = valeur.trim();
        return t.isEmpty() ? null : t;
    }

    private void verifierAcces(AppUserDetails user, Long etablissementId) {
        if (!user.peutAccederEtablissement(etablissementId)) {
            throw new AccessDeniedException("Vous n'avez pas accès à cet établissement.");
        }
    }
}
