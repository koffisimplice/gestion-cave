package com.gestioncave.charge;

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
class RentabiliteFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired ChargeRepository chargeRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;

    @BeforeEach
    void setUp() {
        chargeRepository.deleteAll();
        registreRepository.deleteAll();
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        etablissementId = maquis.getId();

        Boisson boisson = boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000")) // revient 500
                .prixVenteUnitaire(new BigDecimal("800")) // marge 300
                .seuilAlerte(24)
                .etablissements(Set.of(maquis))
                .build());

        // Janvier 2026 : vendu 42 -> CA 33600, benefice brut 12600
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
        chargeRepository.deleteAll();
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

    private void creerCharge(String token, String categorie, String libelle, int montant) throws Exception {
        String body = "{\"etablissementId\":" + etablissementId + ",\"categorie\":\"" + categorie
                + "\",\"libelle\":\"" + libelle + "\",\"montant\":" + montant
                + ",\"periodicite\":\"MENSUELLE\",\"annee\":2026,\"mois\":1}";
        mockMvc.perform(post("/api/charges")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void rentabilite_mensuelle_benefice_net_et_seuil() throws Exception {
        String token = login("proprio@test.local");

        // Charges de janvier : 5000 (fixe) + 1000 (variable) = 6000
        creerCharge(token, "FIXE", "Loyer", 5000);
        creerCharge(token, "VARIABLE", "Electricite", 1000);

        String response = mockMvc.perform(get("/api/charges/rentabilite")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);

        assertThat(json.get("chiffreAffaires").asInt()).isEqualTo(33600);
        assertThat(json.get("beneficeBrut").asInt()).isEqualTo(12600);
        assertThat(json.get("totalCharges").asInt()).isEqualTo(6000);
        // benefice net = 12600 - 6000 = 6600
        assertThat(json.get("beneficeNet").asInt()).isEqualTo(6600);
        assertThat(json.get("beneficiaire").asBoolean()).isTrue();
        // taux 0.375 ; seuil = 6000 / 0.375 = 16000
        assertThat(json.get("tauxMarge").asDouble()).isEqualTo(0.375);
        assertThat(json.get("chiffreAffairesSeuil").asInt()).isEqualTo(16000);
    }

    @Test
    void gerant_interdit_sur_les_charges_et_la_rentabilite() throws Exception {
        String token = login("gerant@test.local");

        mockMvc.perform(get("/api/charges/rentabilite")
                        .header("Authorization", "Bearer " + token)
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isForbidden());

        String body = "{\"etablissementId\":" + etablissementId
                + ",\"categorie\":\"FIXE\",\"libelle\":\"Loyer\",\"montant\":5000"
                + ",\"periodicite\":\"MENSUELLE\",\"annee\":2026,\"mois\":1}";
        mockMvc.perform(post("/api/charges")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }
}
