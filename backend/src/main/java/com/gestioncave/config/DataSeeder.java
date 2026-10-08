package com.gestioncave.config;

import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Amorce des données de démonstration au premier démarrage (base vide) :
 * - 2 maquis
 * - 1 propriétaire (accès complet)
 * - 1 gérant rattaché au premier maquis
 */
@Component
@Profile("!test")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UtilisateurRepository utilisateurRepository;
    private final EtablissementRepository etablissementRepository;
    private final BoissonRepository boissonRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UtilisateurRepository utilisateurRepository,
                      EtablissementRepository etablissementRepository,
                      BoissonRepository boissonRepository,
                      PasswordEncoder passwordEncoder) {
        this.utilisateurRepository = utilisateurRepository;
        this.etablissementRepository = etablissementRepository;
        this.boissonRepository = boissonRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (utilisateurRepository.count() > 0) {
            return;
        }

        Etablissement maquis1 = etablissementRepository.save(Etablissement.builder()
                .nom("Maquis Central")
                .adresse("Quartier Centre")
                .responsable("Propriétaire")
                .build());

        Etablissement maquis2 = etablissementRepository.save(Etablissement.builder()
                .nom("Maquis Riviera")
                .adresse("Quartier Riviera")
                .responsable("Gérant Riviera")
                .build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Propriétaire")
                .email("proprietaire@gestioncave.local")
                .telephone("0700000001")
                .motDePasseHash(passwordEncoder.encode("Proprio@2026"))
                .role(Role.PROPRIETAIRE)
                .etablissements(Set.of(maquis1, maquis2))
                .build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gérant Central")
                .email("gerant@gestioncave.local")
                .telephone("0700000002")
                .motDePasseHash(passwordEncoder.encode("Gerant@2026"))
                .role(Role.GERANT)
                .etablissements(Set.of(maquis1))
                .build());

        // Quelques boissons de démonstration, partagées entre les deux maquis.
        boissonRepository.save(Boisson.builder()
                .designation("Bière Brune 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))
                .prixVenteUnitaire(new BigDecimal("800"))
                .seuilAlerte(24)
                .categorie("Bière")
                .etablissements(Set.of(maquis1, maquis2))
                .build());

        boissonRepository.save(Boisson.builder()
                .designation("Sucrerie 30cl")
                .bouteillesParConditionnement(24)
                .prixAchatCasier(new BigDecimal("4800"))
                .prixVenteUnitaire(new BigDecimal("400"))
                .seuilAlerte(48)
                .categorie("Soft")
                .etablissements(Set.of(maquis1, maquis2))
                .build());

        boissonRepository.save(Boisson.builder()
                .designation("Eau minérale 1,5L")
                .bouteillesParConditionnement(6)
                .prixAchatCasier(new BigDecimal("1800"))
                .prixVenteUnitaire(new BigDecimal("500"))
                .seuilAlerte(12)
                .categorie("Eau")
                .etablissements(Set.of(maquis1))
                .build());

        log.info("=== Données de démonstration créées ===");
        log.info("Propriétaire : proprietaire@gestioncave.local / Proprio@2026");
        log.info("Gérant       : gerant@gestioncave.local / Gerant@2026");
    }
}
