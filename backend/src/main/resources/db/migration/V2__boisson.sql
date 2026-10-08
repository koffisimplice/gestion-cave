-- ============================================================
-- Module 3 : catalogue des boissons (partagées entre établissements)
-- ============================================================

CREATE TABLE boisson (
    id                              BIGSERIAL PRIMARY KEY,
    designation                     VARCHAR(255)   NOT NULL,
    bouteilles_par_conditionnement  INTEGER        NOT NULL,
    prix_achat_casier               NUMERIC(12, 2) NOT NULL,
    prix_vente_unitaire             NUMERIC(12, 2) NOT NULL,
    seuil_alerte                    INTEGER        NOT NULL DEFAULT 0,
    categorie                       VARCHAR(255),
    photo_url                       VARCHAR(1024),
    actif                           BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at                      TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT ck_boisson_conditionnement CHECK (bouteilles_par_conditionnement > 0),
    CONSTRAINT ck_boisson_prix_achat      CHECK (prix_achat_casier >= 0),
    CONSTRAINT ck_boisson_prix_vente      CHECK (prix_vente_unitaire >= 0),
    CONSTRAINT ck_boisson_seuil           CHECK (seuil_alerte >= 0)
);

CREATE TABLE boisson_etablissement (
    boisson_id       BIGINT NOT NULL,
    etablissement_id BIGINT NOT NULL,
    PRIMARY KEY (boisson_id, etablissement_id),
    CONSTRAINT fk_be_boisson       FOREIGN KEY (boisson_id)       REFERENCES boisson (id)       ON DELETE CASCADE,
    CONSTRAINT fk_be_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id) ON DELETE CASCADE
);

CREATE INDEX idx_be_boisson       ON boisson_etablissement (boisson_id);
CREATE INDEX idx_be_etablissement ON boisson_etablissement (etablissement_id);
