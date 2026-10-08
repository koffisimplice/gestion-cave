package com.gestioncave.analyse;

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
class AnalyseFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;
    private Boisson boisson;

    @BeforeEach
    void setUp() {
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        etablissementId = maquis.getId();

        // Casier 6000 / 12 = revient 500 ; PV 800 -> marge 300
        boisson = boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))
                .prixVenteUnitaire(new BigDecimal("800"))
                .seuilAlerte(24)
                .etablissements(Set.of(maquis))
                .build());

        // Journee : commande 60, restant 18 -> vendu 42, PVT 33600
        registreRepository.save(RegistreJournalier.builder()
                .boisson(boisson).etablissement(maquis)
                .date(LocalDate.of(2026, 1, 20))
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
    void proprietaire_obtient_marges_benefices_et_valorisation() throws Exception {
        String token = login("proprio@test.local");

        String response = mockMvc.perform(get("/api/analyse/marges")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("debut", "2026-01-01")
                        .param("fin", "2026-01-31"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);

        assertThat(json.get("totalQuantiteVendue").asInt()).isEqualTo(42);
        assertThat(json.get("chiffreAffaires").asInt()).isEqualTo(33600);
        // benefice = marge 300 x 42 = 12600
        assertThat(json.get("beneficeBrut").asInt()).isEqualTo(12600);
        // stock restant 18 : revient 18x500 = 9000 ; vente 18x800 = 14400
        assertThat(json.get("valorisationStockRevient").asInt()).isEqualTo(9000);
        assertThat(json.get("valorisationStockVente").asInt()).isEqualTo(14400);

        JsonNode ligne = json.get("lignes").get(0);
        assertThat(ligne.get("prixRevientUnitaire").asInt()).isEqualTo(500);
        assertThat(ligne.get("margeUnitaire").asInt()).isEqualTo(300);
        assertThat(ligne.get("benefice").asInt()).isEqualTo(12600);
        assertThat(ligne.get("stockRestant").asInt()).isEqualTo(18);
    }

    @Test
    void gerant_interdit_sur_les_marges() throws Exception {
        String token = login("gerant@test.local");

        mockMvc.perform(get("/api/analyse/marges")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("debut", "2026-01-01")
                        .param("fin", "2026-01-31"))
                .andExpect(status().isForbidden());
    }
}
