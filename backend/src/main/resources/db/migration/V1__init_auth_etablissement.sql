-- ============================================================
-- Module 1 & fondation : établissements, utilisateurs, rattachement
-- ============================================================

CREATE TABLE etablissement (
    id          BIGSERIAL PRIMARY KEY,
    nom         VARCHAR(255) NOT NULL,
    adresse     VARCHAR(255),
    responsable VARCHAR(255),
    actif       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE utilisateur (
    id                BIGSERIAL PRIMARY KEY,
    nom               VARCHAR(255) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role              VARCHAR(20)  NOT NULL,
    actif             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uk_utilisateur_email UNIQUE (email),
    CONSTRAINT ck_utilisateur_role CHECK (role IN ('PROPRIETAIRE', 'GERANT'))
);

CREATE TABLE utilisateur_etablissement (
    utilisateur_id   BIGINT NOT NULL,
    etablissement_id BIGINT NOT NULL,
    PRIMARY KEY (utilisateur_id, etablissement_id),
    CONSTRAINT fk_ue_utilisateur   FOREIGN KEY (utilisateur_id)   REFERENCES utilisateur (id)   ON DELETE CASCADE,
    CONSTRAINT fk_ue_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissement (id) ON DELETE CASCADE
);

CREATE INDEX idx_ue_utilisateur   ON utilisateur_etablissement (utilisateur_id);
CREATE INDEX idx_ue_etablissement ON utilisateur_etablissement (etablissement_id);
