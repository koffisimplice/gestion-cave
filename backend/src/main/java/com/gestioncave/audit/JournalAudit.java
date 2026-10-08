package com.gestioncave.audit;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Une entrée du journal d'audit : une action sensible réalisée par un utilisateur.
 * L'acteur est conservé en texte (snapshot) pour survivre à la suppression du compte.
 */
@Entity
@Table(name = "journal_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JournalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_heure", nullable = false)
    private Instant dateHeure;

    /** Identifiant du compte auteur (null si inconnu, ex. échec de connexion). */
    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    /** Email/identifiant de l'acteur au moment de l'action (snapshot). */
    @Column(nullable = false)
    private String acteur;

    /** Code d'action (CONNEXION, UTILISATEUR_CREE, FOURNISSEUR_SUPPRIME, ...). */
    @Column(nullable = false, length = 64)
    private String action;

    /** Cible de l'action (nom/id lisible), optionnelle. */
    private String cible;

    @Column(length = 500)
    private String details;
}
