package com.gestioncave.personnel;

import com.gestioncave.charge.Charge;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Paiement du salaire d'un employé pour un mois donné (année + mois). Un seul paiement
 * possible par employé et par mois. À la création, une charge (catégorie SALAIRE) est
 * générée et liée ici ; l'annulation du paiement supprime cette charge.
 */
@Entity
@Table(name = "paiement_salaire",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_paiement_employe_periode",
                columnNames = {"employe_id", "annee", "mois"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementSalaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "employe_id", nullable = false)
    private Employe employe;

    @Column(nullable = false)
    private int annee;

    @Column(nullable = false)
    private int mois;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal montant;

    @Column(name = "date_paiement", nullable = false)
    private LocalDate datePaiement;

    /** Charge d'exploitation générée par ce paiement (pour la rentabilité). */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "charge_id")
    private Charge charge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
