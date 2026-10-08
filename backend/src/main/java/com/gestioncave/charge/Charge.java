package com.gestioncave.charge;

import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Une charge d'exploitation rattachée à un établissement et à un mois précis
 * (année + mois). Sert au calcul du bénéfice net et du seuil de rentabilité.
 */
@Entity
@Table(name = "charge")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Charge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "etablissement_id", nullable = false)
    private Etablissement etablissement;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private CategorieCharge categorie;

    @Column(nullable = false, length = 200)
    private String libelle;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Periodicite periodicite;

    /** Année du mois concerné. */
    @Column(nullable = false)
    private int annee;

    /** Mois concerné (1 = janvier … 12 = décembre). */
    @Column(nullable = false)
    private int mois;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
