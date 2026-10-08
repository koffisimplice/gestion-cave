package com.gestioncave.etablissement;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "etablissement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Etablissement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String adresse;

    private String responsable;

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
