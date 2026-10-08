package com.gestioncave.utilisateur;

import com.gestioncave.etablissement.Etablissement;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "utilisateur")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false, unique = true)
    private String email;

    /** Identifiant de connexion alternatif à l'email. Optionnel mais unique s'il est renseigné. */
    @Column(unique = true, length = 30)
    private String telephone;

    @Column(name = "mot_de_passe_hash", nullable = false)
    private String motDePasseHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    /**
     * Établissements rattachés. Un GERANT en a un (ou plusieurs) ; un PROPRIETAIRE
     * a un accès complet quel que soit ce rattachement (contrôlé côté service).
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "utilisateur_etablissement",
            joinColumns = @JoinColumn(name = "utilisateur_id"),
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
