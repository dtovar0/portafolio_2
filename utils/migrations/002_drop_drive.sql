-- Retira el almacenamiento de archivos: las plataformas pasan a ser un
-- catálogo de enlaces.
--
-- Respaldo previo en catalogo_2-backup/:
--   drive_tables_backup.sql        (drive_activity y storage_stats)
--   platforms_drive_columns.csv    (las columnas que se eliminan)
--
-- Irreversible sin esos respaldos.

DROP TABLE IF EXISTS storage_stats;
DROP TABLE IF EXISTS drive_activity;

ALTER TABLE platforms
    DROP COLUMN storage_path,
    DROP COLUMN can_download,
    DROP COLUMN can_upload,
    DROP COLUMN can_delete,
    DROP COLUMN is_encrypted,
    DROP COLUMN password;
