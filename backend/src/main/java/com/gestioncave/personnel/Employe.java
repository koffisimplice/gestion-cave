package com.gestioncave.personnel;

import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Un membre du personnel rattaché à un maquis. Son salaire mensuel de base sert de
 * montant pré-rempli lors du paiement ; chaque paiement effectif génère une charge
 * (catégorie SALAIRE) pour que le bénéfice net du mois soit exact.
 */
@Entity
@Table(name = "employe")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "etablissement_id", nullable = false)
    private Etablissement etablissement;

    @Column(nullable = false, length = 120)
    private String nom;

    @Column(length = 80)
    private String poste;

    /** Salaire mensuel de base, pré-rempli au paiement mais ajustable. */
    @Column(name = "salaire_mensuel", nullable = false, precision = 14, scale = 2)
    private BigDecimal salaireMensuel;

    @Column(length = 30)
    private String telephone;

    @Column(name = "date_embauche")
    private LocalDate dateEmbauche;

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
