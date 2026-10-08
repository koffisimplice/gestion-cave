package com.gestioncave.personnel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.boisson.Boisson;
import com.gestioncave.boisson.BoissonRepository;
import com.gestioncave.charge.ChargeRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PersonnelFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired RegistreJournalierRepository registreRepository;
    @Autowired ChargeRepository chargeRepository;
    @Autowired EmployeRepository employeRepository;
    @Autowired PaiementSalaireRepository paiementRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Long etablissementId;

    @BeforeEach
    void setUp() {
        nettoyer();

        Etablissement maquis = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        etablissementId = maquis.getId();

        Boisson boisson = boissonRepository.save(Boisson.builder()
                .designation("Biere 60cl")
                .bouteillesParConditionnement(12)
                .prixAchatCasier(new BigDecimal("6000"))   // revient 500
                .prixVenteUnitaire(new BigDecimal("800"))  // marge 300
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
        nettoyer();
    }

    private void nettoyer() {
        paiementRepository.deleteAll();
        chargeRepository.deleteAll();
        employeRepository.deleteAll();
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

    private long creerEmploye(String token, String nom, int salaire) throws Exception {
        String body = "{\"etablissementId\":" + etablissementId + ",\"nom\":\"" + nom
                + "\",\"poste\":\"Serveur\",\"salaireMensuel\":" + salaire + "}";
        String response = mockMvc.perform(post("/api/personnel/employes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private int totalCharges(String token) throws Exception {
        String response = mockMvc.perform(get("/api/charges/rentabilite")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("totalCharges").asInt();
    }

    @Test
    void paiement_genere_une_charge_et_reduit_le_benefice_net() throws Exception {
        String token = login("proprio@test.local");
        long employeId = creerEmploye(token, "Kouassi Jean", 8000);

        // État initial : non payé, aucune charge.
        assertThat(totalCharges(token)).isZero();

        String payBody = "{\"employeId\":" + employeId + ",\"annee\":2026,\"mois\":1,"
                + "\"montant\":8000,\"datePaiement\":\"2026-01-28\"}";
        String payResp = mockMvc.perform(post("/api/personnel/paie")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(payBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode paie = objectMapper.readTree(payResp);
        assertThat(paie.get("paye").asBoolean()).isTrue();
        long paiementId = paie.get("paiementId").asLong();

        // La charge de salaire est comptée dans la rentabilité : net = 12600 - 8000 = 4600.
        String rentaResp = mockMvc.perform(get("/api/charges/rentabilite")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode renta = objectMapper.readTree(rentaResp);
        assertThat(renta.get("totalCharges").asInt()).isEqualTo(8000);
        assertThat(renta.get("beneficeNet").asInt()).isEqualTo(4600);

        // Une charge de catégorie SALAIRE a bien été créée.
        boolean aSalaire = false;
        for (JsonNode c : renta.get("charges")) {
            if ("SALAIRE".equals(c.get("categorie").asText())) aSalaire = true;
        }
        assertThat(aSalaire).isTrue();

        // Double paiement du même mois refusé.
        mockMvc.perform(post("/api/personnel/paie")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(payBody))
                .andExpect(status().isConflict());

        // Annulation : la charge est retirée, le bénéfice revient à 12600.
        mockMvc.perform(delete("/api/personnel/paie/" + paiementId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(totalCharges(token)).isZero();
    }

    @Test
    void la_charge_de_salaire_n_est_pas_modifiable_depuis_les_charges() throws Exception {
        String token = login("proprio@test.local");
        long employeId = creerEmploye(token, "Ama Grace", 5000);

        String payBody = "{\"employeId\":" + employeId + ",\"annee\":2026,\"mois\":1,"
                + "\"montant\":5000,\"datePaiement\":\"2026-01-28\"}";
        mockMvc.perform(post("/api/personnel/paie")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(payBody))
                .andExpect(status().isCreated());

        // Retrouve l'id de la charge de salaire.
        String chargesResp = mockMvc.perform(get("/api/charges")
                        .header("Authorization", "Bearer " + token)
                        .param("etablissementId", String.valueOf(etablissementId))
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long chargeSalaireId = -1;
        for (JsonNode c : objectMapper.readTree(chargesResp)) {
            if ("SALAIRE".equals(c.get("categorie").asText())) chargeSalaireId = c.get("id").asLong();
        }
        assertThat(chargeSalaireId).isPositive();

        // Suppression directe interdite (gérée depuis Personnel & Paie).
        mockMvc.perform(delete("/api/charges/" + chargeSalaireId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        // Création manuelle d'une charge SALAIRE interdite également.
        String body = "{\"etablissementId\":" + etablissementId
                + ",\"categorie\":\"SALAIRE\",\"libelle\":\"Salaire libre\",\"montant\":1000"
                + ",\"periodicite\":\"MENSUELLE\",\"annee\":2026,\"mois\":1}";
        mockMvc.perform(post("/api/charges")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void gerant_interdit_sur_le_personnel() throws Exception {
        String token = login("gerant@test.local");

        mockMvc.perform(get("/api/personnel/employes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/personnel/paie")
                        .header("Authorization", "Bearer " + token)
                        .param("annee", "2026").param("mois", "1"))
                .andExpect(status().isForbidden());

        String body = "{\"etablissementId\":" + etablissementId
                + ",\"nom\":\"Test\",\"salaireMensuel\":1000}";
        mockMvc.perform(post("/api/personnel/employes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }
}
