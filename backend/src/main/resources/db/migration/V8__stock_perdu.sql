-- Module « Pertes / casse » : quantité perdue par ligne de registre
-- (casse, périmé, offert, vol...). Exclue du chiffre d'affaires, elle réduit
-- néanmoins le stock : stock_restant = nouveau_stock - stock_vendu - stock_perdu.
ALTER TABLE registre_journalier
    ADD COLUMN stock_perdu INTEGER NOT NULL DEFAULT 0;

-- Motif optionnel de la perte (texte libre court).
ALTER TABLE registre_journalier
    ADD COLUMN motif_perte VARCHAR(255);
