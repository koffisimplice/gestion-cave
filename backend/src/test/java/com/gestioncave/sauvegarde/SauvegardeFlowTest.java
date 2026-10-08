package com.gestioncave.sauvegarde;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.RegistreJournalierRepository;
import com.gestioncave.registre.StatutRegistre;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SauvegardeFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());

        Boisson boisson = boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))
                .prixVenteUnitaire(new BigDecimal("800"))
                .seuilAlerte(24)
                .etablissements(Set.of(maquis))
                .build());

        registreRepository.save(RegistreJournalier.builder()
                .boisson(boisson).etablissement(maquis)
                .date(LocalDate.of(2026, 5, 15))
                .ancienStock(0).commandeDuJour(60).nouveauStock(60)
                .stockRestant(18).stockVendu(42)
                .prixUnitaire(new BigDecimal("800"))
                .prixVenteTotal(new BigDecimal("33600"))
                .statut(StatutRegistre.CLOTURE)
                .build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Proprio").email("proprio@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.PROPRIETAIRE).etablissements(Set.of()).build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gerant").email("gerant@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.GERANT).etablissements(Set.of(maquis)).build());
    }

    @AfterEach
    void tearDown() {
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();
    }

    private String login(String email) throws Exception {
        String body = "{\"email\":\"%s\",\"motDePasse\":\"secret\"}".formatted(email);
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    @Test
    void export_contient_toutes_les_donnees() throws Exception {
        String token = login("proprio@test.local");
        String json = mockMvc.perform(get("/api/sauvegardes/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode snap = objectMapper.readTree(json);

        assertThat(snap.get("version").asInt()).isEqualTo(1);
        assertThat(snap.get("etablissements")).hasSize(1);
        assertThat(snap.get("utilisateurs")).hasSize(2);
        assertThat(snap.get("boissons")).hasSize(1);
        assertThat(snap.get("registres")).hasSize(1);
    }

    @Test
    void sauvegarde_puis_restauration_remplace_les_donnees() throws Exception {
        String token = login("proprio@test.local");

        // Sauvegarde immédiate sur le serveur.
        String repSave = mockMvc.perform(post("/api/sauvegardes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String nom = objectMapper.readTree(repSave).get("nom").asText();

        // Modifie l'état : un 2e établissement apparaît.
        etablissementRepository.save(Etablissement.builder().nom("Maquis B").build());
        assertThat(etablissementRepository.count()).isEqualTo(2);

        // Restauration depuis la sauvegarde stockée.
        mockMvc.perform(post("/api/sauvegardes/restaurer/" + nom)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // L'état est revenu à l'instantané : 1 établissement, données intactes.
        assertThat(etablissementRepository.count()).isEqualTo(1);
        assertThat(boissonRepository.count()).isEqualTo(1);
        assertThat(registreRepository.count()).isEqualTo(1);
        assertThat(utilisateurRepository.count()).isEqualTo(2);

        RegistreJournalier ligne = registreRepository.findAll().get(0);
        assertThat(ligne.getStockVendu()).isEqualTo(42);
        assertThat(ligne.getBoisson().getDesignation()).isEqualTo("Biere 60cl");
    }

    @Test
    void gerant_interdit_sur_les_sauvegardes() throws Exception {
        String token = login("gerant@test.local");
        mockMvc.perform(get("/api/sauvegardes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/sauvegardes/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
