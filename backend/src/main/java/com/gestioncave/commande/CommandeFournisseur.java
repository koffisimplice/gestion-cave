package com.gestioncave.commande;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Un achat / une commande fournisseur : entrée de stock exprimée en casiers/cartons,
 * convertie automatiquement en bouteilles ajoutées au registre du jour.
 */
@Entity
@Table(name = "commande_fournisseur")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommandeFournisseur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "boisson_id", nullable = false)
    private Boisson boisson;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "etablissement_id", nullable = false)
    private Etablissement etablissement;

    @Column(nullable = false)
    private LocalDate date;

    /** Type de conditionnement figé au moment de l'achat (snapshot). */
    @Enumerated(EnumType.STRING)
    @Column(name = "type_conditionnement", nullable = false, length = 20)
    @Builder.Default
    private com.gestioncave.boisson.TypeConditionnement typeConditionnement =
            com.gestioncave.boisson.TypeConditionnement.CASIER;

    /** Nombre de conditionnements commandés (casiers, cartons, packs…). */
    @Column(name = "nombre_casiers", nullable = false)
    private int nombreCasiers;

    /** Bouteilles par conditionnement figées au moment de l'achat (snapshot). */
    @Column(name = "bouteilles_par_casier", nullable = false)
    private int bouteillesParCasier;

    /** = nombre de casiers × bouteilles par casier (ajoutées au stock du jour). */
    @Column(name = "bouteilles_ajoutees", nullable = false)
    private int bouteillesAjoutees;

    /** Nom du fournisseur (optionnel, snapshot texte — conservé pour rapports et legacy). */
    private String fournisseur;

    /** Fiche fournisseur liée (optionnelle) : permet l'historique et la comparaison de prix. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fournisseur_id")
    private com.gestioncave.fournisseur.Fournisseur fournisseurRef;

    /** Prix d'achat d'un casier payé pour cet achat (donnée financière). */
    @Column(name = "prix_achat_casier", nullable = false, precision = 12, scale = 2)
    private BigDecimal prixAchatCasier;

    /** = prix d'achat du casier × nombre de casiers (donnée financière). */
    @Column(name = "montant_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal montantTotal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
