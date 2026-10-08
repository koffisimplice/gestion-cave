package com.gestioncave.fournisseur;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Fiche fournisseur : un partenaire auprès duquel on effectue des achats.
 * Rattachée aux achats (commande fournisseur) pour l'historique et la
 * comparaison de prix par fournisseur.
 */
@Entity
@Table(name = "fournisseur")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fournisseur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String telephone;

    /** Nom de la personne de contact chez le fournisseur. */
    private String contact;

    private String adresse;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
