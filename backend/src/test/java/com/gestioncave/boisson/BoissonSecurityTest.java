package com.gestioncave.boisson;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.etablissement.Etablissement;
import com.gestioncave.etablissement.EtablissementRepository;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BoissonSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired BoissonRepository boissonRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Etablissement maquisA;
    private Etablissement maquisB;

    @BeforeEach
    void setUp() {
        boissonRepository.deleteAll();
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        maquisA = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        maquisB = etablissementRepository.save(Etablissement.builder().nom("Maquis B").build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Proprio").email("proprio@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.PROPRIETAIRE).etablissements(Set.of(maquisA, maquisB)).build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gerant").email("gerant@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.GERANT).etablissements(Set.of(maquisA)).build());
    }

    private String login(String email) throws Exception {
        String body = "{\"email\":\"%s\",\"motDePasse\":\"secret\"}".formatted(email);
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private Long creerBiereParProprio(String token) throws Exception {
        String body = """
                {
                  "designation": "Biere 60cl",
                  "bouteillesParConditionnement": 12,
                  "prixAchatCasier": 6000,
                  "prixVenteUnitaire": 800,
                  "seuilAlerte": 24,
                  "etablissementIds": [%d, %d]
                }
                """.formatted(maquisA.getId(), maquisB.getId());
        String response = mockMvc.perform(post("/api/boissons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                // Le propriétaire voit le prix de revient : 6000 / 12 = 500.00
                .andExpect(jsonPath("$.prixRevientUnitaire").value(500.00))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void proprietaire_cree_et_voit_les_couts() throws Exception {
        creerBiereParProprio(login("proprio@test.local"));
    }

    @Test
    void gerant_ne_peut_pas_creer_une_boisson() throws Exception {
        String token = login("gerant@test.local");
        mockMvc.perform(post("/api/boissons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"designation\":\"X\",\"bouteillesParConditionnement\":12,\"prixAchatCasier\":6000,\"prixVenteUnitaire\":800,\"seuilAlerte\":0,\"etablissementIds\":[" + maquisA.getId() + "]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void boisson_partagee_visible_par_le_gerant_sans_couts() throws Exception {
        creerBiereParProprio(login("proprio@test.local"));

        String tokenGerant = login("gerant@test.local");
        String response = mockMvc.perform(get("/api/boissons")
                        .header("Authorization", "Bearer " + tokenGerant))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = objectMapper.readTree(response);
        assertThat(arr).hasSize(1);
        JsonNode b = arr.get(0);
        assertThat(b.get("designation").asText()).isEqualTo("Biere 60cl");
        assertThat(b.get("prixVenteUnitaire").asInt()).isEqualTo(800);
        // Confidentialité : le gérant ne voit ni le prix d'achat ni le prix de revient.
        assertThat(b.get("prixAchatCasier").isNull()).isTrue();
        assertThat(b.get("prixRevientUnitaire").isNull()).isTrue();
    }
}
