-- ============================================================
-- Module 5 : achats / commandes fournisseurs
-- ============================================================

CREATE TABLE commande_fournisseur (
    id                   BIGSERIAL PRIMARY KEY,
    boisson_id           BIGINT         NOT NULL,
    etablissement_id     BIGINT         NOT NULL,
    date                 DATE           NOT NULL,
    nombre_casiers       INTEGER        NOT NULL,
    bouteilles_par_casier INTEGER       NOT NULL,
    bouteilles_ajoutees  INTEGER        NOT NULL,
    fournisseur          VARCHAR(160),
    prix_achat_casier    NUMERIC(12, 2) NOT NULL,
    montant_total        NUMERIC(14, 2) NOT NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_cf_boisson       FOREIGN KEY (boisson_id)       REFERENCES boisson (id),
    CONSTRAINT fk_cf_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id),
    CONSTRAINT ck_cf_casiers       CHECK (nombre_casiers > 0),
    CONSTRAINT ck_cf_bouteilles    CHECK (bouteilles_ajoutees > 0)
);

CREATE INDEX idx_cf_etab_date ON commande_fournisseur (etablissement_id, date);
CREATE INDEX idx_cf_boisson    ON commande_fournisseur (boisson_id);
