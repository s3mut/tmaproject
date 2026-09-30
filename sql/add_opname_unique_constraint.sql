ALTER TABLE stock_opname_details
ADD CONSTRAINT opname_id_asset_id_unique UNIQUE(opname_id, asset_id);
