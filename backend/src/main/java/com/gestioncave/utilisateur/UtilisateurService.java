package com.gestioncave.utilisateur;

import com.gestioncave.audit.AuditService;
import com.gestioncave.common.BusinessException;
import com.gestioncave.common.NotFoundException;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.utilisateur.dto.UtilisateurAdminResponse;
import com.gestioncave.utilisateur.dto.UtilisateurRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Gestion des comptes utilisateurs (propriétaire uniquement). Applique les règles
 * d'unicité (email, téléphone) et les garde-fous anti-verrouillage (ne pas se
 * désactiver soi-même, garder au moins un propriétaire actif).
 */
@Service
@Transactional
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final EtablissementRepository etablissementRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UtilisateurService(UtilisateurRepository utilisateurRepository,
                              EtablissementRepository etablissementRepository,
                              PasswordEncoder passwordEncoder,
                              AuditService auditService) {
        this.utilisateurRepository = utilisateurRepository;
        this.etablissementRepository = etablissementRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<UtilisateurAdminResponse> lister() {
        return utilisateurRepository.findAll().stream()
                .sorted(Comparator.comparing(Utilisateur::getNom, String.CASE_INSENSITIVE_ORDER))
                .map(UtilisateurAdminResponse::from)
                .toList();
    }

    public UtilisateurAdminResponse creer(UtilisateurRequest req) {
        String email = req.email().trim().toLowerCase();
        if (utilisateurRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Un utilisateur avec cet email existe déjà.");
        }
        String telephone = normaliserTelephone(req.telephone());
        if (telephone != null && utilisateurRepository.existsByTelephone(telephone)) {
            throw new BusinessException("Ce numéro de téléphone est déjà utilisé.");
        }
        if (req.motDePasse() == null || req.motDePasse().isBlank()) {
            throw new BusinessException("Le mot de passe est obligatoire à la création.");
        }

        Utilisateur u = Utilisateur.builder()
                .nom(req.nom().trim())
                .email(email)
                .telephone(telephone)
                .motDePasseHash(passwordEncoder.encode(req.motDePasse()))
                .role(req.role())
                .actif(true)
                .etablissements(resoudreEtablissements(req))
                .build();

        u = utilisateurRepository.save(u);
        auditService.enregistrer("UTILISATEUR_CREE", u.getEmail(),
                "Rôle " + u.getRole().name());
        return UtilisateurAdminResponse.from(u);
    }

    public UtilisateurAdminResponse modifier(Long id, UtilisateurRequest req) {
        Utilisateur u = getOrThrow(id);

        String email = req.email().trim().toLowerCase();
        if (utilisateurRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new BusinessException("Un autre utilisateur utilise déjà cet email.");
        }
        String telephone = normaliserTelephone(req.telephone());
        if (telephone != null && utilisateurRepository.existsByTelephoneAndIdNot(telephone, id)) {
            throw new BusinessException("Ce numéro de téléphone est déjà utilisé.");
        }

        // Empêche de retirer le dernier propriétaire actif (perte d'accès complet).
        if (u.getRole() == Role.PROPRIETAIRE && req.role() != Role.PROPRIETAIRE
                && u.isActif() && dernierProprietaireActif(id)) {
            throw new BusinessException(
                    "Impossible : c'est le dernier propriétaire actif. Créez-en un autre d'abord.");
        }

        u.setNom(req.nom().trim());
        u.setEmail(email);
        u.setTelephone(telephone);
        u.setRole(req.role());
        u.setEtablissements(resoudreEtablissements(req));

        if (req.motDePasse() != null && !req.motDePasse().isBlank()) {
            u.setMotDePasseHash(passwordEncoder.encode(req.motDePasse()));
        }

        u = utilisateurRepository.save(u);
        auditService.enregistrer("UTILISATEUR_MODIFIE", u.getEmail(), null);
        return UtilisateurAdminResponse.from(u);
    }

    /** Active ou désactive un compte. Un compte désactivé ne peut plus se connecter. */
    public UtilisateurAdminResponse changerActivation(Long id, boolean actif, Long idCourant) {
        Utilisateur u = getOrThrow(id);

        if (!actif) {
            if (id.equals(idCourant)) {
                throw new BusinessException("Vous ne pouvez pas désactiver votre propre compte.");
            }
            if (u.getRole() == Role.PROPRIETAIRE && u.isActif() && dernierProprietaireActif(id)) {
                throw new BusinessException(
                        "Impossible : c'est le dernier propriétaire actif.");
            }
        }

        u.setActif(actif);
        u = utilisateurRepository.save(u);
        auditService.enregistrer(actif ? "UTILISATEUR_ACTIVE" : "UTILISATEUR_DESACTIVE",
                u.getEmail(), null);
        return UtilisateurAdminResponse.from(u);
    }

    private boolean dernierProprietaireActif(Long id) {
        // Vrai si l'utilisateur (propriétaire actif) est le seul propriétaire actif restant.
        return utilisateurRepository.countByRoleAndActifTrue(Role.PROPRIETAIRE) <= 1;
    }

    private Set<Etablissement> resoudreEtablissements(UtilisateurRequest req) {
        Set<Etablissement> resultat = new HashSet<>();
        // Un propriétaire a un accès complet : le rattachement est facultatif.
        if (req.etablissementIds() == null || req.etablissementIds().isEmpty()) {
            if (req.role() == Role.GERANT) {
                throw new BusinessException("Un gérant doit être rattaché à au moins un maquis.");
            }
            return resultat;
        }
        for (Long id : req.etablissementIds()) {
            Etablissement e = etablissementRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Établissement introuvable : " + id));
            resultat.add(e);
        }
        return resultat;
    }

    private String normaliserTelephone(String valeur) {
        if (valeur == null) {
            return null;
        }
        String t = valeur.trim();
        return t.isEmpty() ? null : t;
    }

    private Utilisateur getOrThrow(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable : " + id));
    }
}
