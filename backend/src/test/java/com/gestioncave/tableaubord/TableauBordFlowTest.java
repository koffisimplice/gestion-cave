package com.gestioncave.tableaubord;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.charge.CategorieCharge;
import com.gestioncave.charge.Charge;
import com.gestioncave.charge.ChargeRepository;
import com.gestioncave.charge.Periodicite;
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
class TableauBordFlowTest {

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

        chargeRepository.save(Charge.builder()
                .etablissement(maquis).categorie(CategorieCharge.FIXE)
                .libelle("Loyer").montant(new BigDecimal("6000"))
                .periodicite(Periodicite.MENSUELLE).annee(2026).mois(5).build());

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

    private JsonNode synthese(String token) throws Exception {
        String response = mockMvc.perform(get("/api/tableau-de-bord")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("date", "2026-05-15"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    @Test
    void proprietaire_voit_operationnel_et_financier() throws Exception {
        JsonNode json = synthese(login("proprio@test.local"));

        assertThat(json.get("ventesDuMois").get("quantite").asInt()).isEqualTo(42);
        assertThat(json.get("ventesDuMois").get("chiffreAffaires").asInt()).isEqualTo(33600);
        assertThat(json.get("stockTotal").asInt()).isEqualTo(18);
        assertThat(json.get("meilleuresVentes").get(0).get("quantiteVendue").asInt()).isEqualTo(42);
        // Financier visible
        assertThat(json.get("beneficeBrutMois").asInt()).isEqualTo(12600);
        assertThat(json.get("beneficeNetMois").asInt()).isEqualTo(6600);
        assertThat(json.get("beneficiaire").asBoolean()).isTrue();
    }

    @Test
    void gerant_voit_operationnel_mais_pas_financier() throws Exception {
        JsonNode json = synthese(login("gerant@test.local"));

        assertThat(json.get("ventesDuMois").get("quantite").asInt()).isEqualTo(42);
        assertThat(json.get("stockTotal").asInt()).isEqualTo(18);
        // Financier masqué
        assertThat(json.get("beneficeBrutMois").isNull()).isTrue();
        assertThat(json.get("beneficeNetMois").isNull()).isTrue();
        assertThat(json.get("beneficiaire").isNull()).isTrue();
    }

    @Test
    void historique_filtrable_accessible_au_gerant() throws Exception {
        String token = login("gerant@test.local");
        String response = mockMvc.perform(get("/api/tableau-de-bord/historique")
                        .header("Authorization", "Bearer " + token)
                        .param("debut", "2026-05-01").param("fin", "2026-05-31"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        assertThat(json).hasSize(1);
        assertThat(json.get(0).get("stockVendu").asInt()).isEqualTo(42);
    }

    @Test
    void export_pdf_reserve_au_proprietaire() throws Exception {
        String proprio = login("proprio@test.local");
        byte[] pdf = mockMvc.perform(get("/api/tableau-de-bord/rapport/pdf")
                        .header("Authorization", "Bearer " + proprio)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "5"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        // En-tête d'un fichier PDF
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");

        String gerant = login("gerant@test.local");
        mockMvc.perform(get("/api/tableau-de-bord/rapport/pdf")
                        .header("Authorization", "Bearer " + gerant)
                        .param("annee", "2026").param("mois", "5"))
                .andExpect(status().isForbidden());
    }

    @Test
    void export_excel_genere_un_fichier() throws Exception {
        String proprio = login("proprio@test.local");
        byte[] xlsx = mockMvc.perform(get("/api/tableau-de-bord/rapport/excel")
                        .header("Authorization", "Bearer " + proprio)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "5"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        // Signature ZIP (les .xlsx sont des archives ZIP : 'PK')
        assertThat(xlsx.length).isGreaterThan(100);
        assertThat(xlsx[0]).isEqualTo((byte) 'P');
        assertThat(xlsx[1]).isEqualTo((byte) 'K');
    }
}
