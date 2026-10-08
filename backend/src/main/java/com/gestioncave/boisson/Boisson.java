package com.gestioncave.boisson;

import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "boisson")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Boisson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String designation;

    /** Type de conditionnement d'achat (casier, carton, pack, fût, unité). */
    @Enumerated(EnumType.STRING)
    @Column(name = "type_conditionnement", nullable = false, length = 20)
    @Builder.Default
    private TypeConditionnement typeConditionnement = TypeConditionnement.CASIER;

    /** Nombre de bouteilles par conditionnement (ex. casier de 12). */
    @Column(name = "bouteilles_par_conditionnement", nullable = false)
    private int bouteillesParConditionnement;

    /** Prix d'achat d'un conditionnement (casier/carton). */
    @Column(name = "prix_achat_casier", nullable = false, precision = 12, scale = 2)
    private BigDecimal prixAchatCasier;

    /** Prix de vente d'une bouteille. */
    @Column(name = "prix_vente_unitaire", nullable = false, precision = 12, scale = 2)
    private BigDecimal prixVenteUnitaire;

    /** Seuil d'alerte de stock (en bouteilles). */
    @Column(name = "seuil_alerte", nullable = false)
    @Builder.Default
    private int seuilAlerte = 0;

    private String categorie;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    /** Établissements où la boisson est disponible (partage sans ressaisie). */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "boisson_etablissement",
            joinColumns = @JoinColumn(name = "boisson_id"),
            inverseJoinColumns = @JoinColumn(name = "etablissement_id")
    )
    @Builder.Default
    private Set<Etablissement> etablissements = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
