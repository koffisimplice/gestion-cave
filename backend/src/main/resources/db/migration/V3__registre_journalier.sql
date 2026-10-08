-- ============================================================
-- Module 4 : registre journalier (point quotidien de stock)
-- ============================================================

CREATE TABLE registre_journalier (
    id               BIGSERIAL PRIMARY KEY,
    boisson_id       BIGINT         NOT NULL,
    etablissement_id BIGINT         NOT NULL,
    date             DATE           NOT NULL,
    ancien_stock     INTEGER        NOT NULL,
    commande_du_jour INTEGER        NOT NULL DEFAULT 0,
    nouveau_stock    INTEGER        NOT NULL,
    stock_restant    INTEGER,
    stock_vendu      INTEGER,
    prix_unitaire    NUMERIC(12, 2) NOT NULL,
    prix_vente_total NUMERIC(12, 2),
    statut           VARCHAR(12)    NOT NULL DEFAULT 'OUVERT',
    cloture_at       TIMESTAMP,
    created_at       TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT fk_rj_boisson       FOREIGN KEY (boisson_id)       REFERENCES boisson (id),
    CONSTRAINT fk_rj_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id),
    CONSTRAINT uk_registre_boisson_etab_date UNIQUE (boisson_id, etablissement_id, date),
    CONSTRAINT ck_rj_statut        CHECK (statut IN ('OUVERT', 'CLOTURE')),
    CONSTRAINT ck_rj_ancien        CHECK (ancien_stock >= 0),
    CONSTRAINT ck_rj_commande      CHECK (commande_du_jour >= 0),
    CONSTRAINT ck_rj_restant       CHECK (stock_restant IS NULL OR (stock_restant >= 0 AND stock_restant <= nouveau_stock))
);

CREATE INDEX idx_rj_etab_date ON registre_journalier (etablissement_id, date);
CREATE INDEX idx_rj_boisson    ON registre_journalier (boisson_id);
