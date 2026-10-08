-- Type de conditionnement d'achat (casier, carton, pack, fût, unité).
-- Les boissons et achats existants sont considérés comme des casiers par défaut.

ALTER TABLE boisson
    ADD COLUMN type_conditionnement VARCHAR(20) NOT NULL DEFAULT 'CASIER';

ALTER TABLE commande_fournisseur
    ADD COLUMN type_conditionnement VARCHAR(20) NOT NULL DEFAULT 'CASIER';
