-- Elimina access_requests, huérfana desde que se retiró el módulo de
-- solicitudes: ningún modelo Python la declara y nada la consulta.
--
-- Respaldo previo en catalogo_2-backup/access_requests_backup.sql
DROP TABLE IF EXISTS access_requests;
