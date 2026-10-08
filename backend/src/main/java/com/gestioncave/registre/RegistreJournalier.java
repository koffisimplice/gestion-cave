package com.gestioncave.registre;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Une ligne du registre journalier : un point quotidien pour une boisson
 * dans un établissement donné. Reproduit les colonnes du registre papier.
 */
@Entity
@Table(
        name = "registre_journalier",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_registre_boisson_etab_date",
                columnNames = {"boisson_id", "etablissement_id", "date"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistreJournalier {

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

    /** Stock en début de journée (repris de la veille). */
    @Column(name = "ancien_stock", nullable = false)
    private int ancienStock;

    /** Bouteilles ajoutées dans la journée (commande du jour). */
    @Column(name = "commande_du_jour", nullable = false)
    @Builder.Default
    private int commandeDuJour = 0;

    /** = ancien stock + commande du jour (calculé, persisté pour l'historique). */
    @Column(name = "nouveau_stock", nullable = false)
    private int nouveauStock;

    /** Stock restant saisi en fin de journée (null tant que non saisi). */
    @Column(name = "stock_restant")
    private Integer stockRestant;

    /** = nouveau stock − stock restant (calculé ; null tant que restant non saisi). */
    @Column(name = "stock_vendu")
    private Integer stockVendu;

    /** Bouteilles perdues dans la journée (casse, périmé, offert, vol...). Exclues du CA. */
    @Column(name = "stock_perdu", nullable = false)
    @Builder.Default
    private int stockPerdu = 0;

    /** Motif optionnel de la perte (texte libre). */
    @Column(name = "motif_perte", length = 255)
    private String motifPerte;

    /** Prix de vente unitaire figé au moment du point. */
    @Column(name = "prix_unitaire", nullable = false, precision = 12, scale = 2)
    private BigDecimal prixUnitaire;

    /** = stock vendu × prix unitaire (calculé ; null tant que restant non saisi). */
    @Column(name = "prix_vente_total", precision = 12, scale = 2)
    private BigDecimal prixVenteTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private StatutRegistre statut = StatutRegistre.OUVERT;

    @Column(name = "cloture_at")
    private Instant clotureAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
