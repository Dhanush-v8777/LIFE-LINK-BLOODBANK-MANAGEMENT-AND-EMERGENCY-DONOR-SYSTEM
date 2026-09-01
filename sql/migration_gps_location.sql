-- Migration: GPS Location Timestamps
-- Adds location_updated_at to all 4 role tables
-- latitude/longitude/city/pincode already exist from migration_nearby_search.sql
-- This is ADDITIVE ONLY — no existing data is modified.

USE lifelink_db;

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
  IN tbl_name VARCHAR(100),
  IN col_name VARCHAR(100),
  IN col_definition VARCHAR(255)
)
BEGIN
  DECLARE col_count INT;
  SELECT COUNT(*) INTO col_count
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND COLUMN_NAME = col_name;
  IF col_count = 0 THEN
    SET @alter_sql = CONCAT('ALTER TABLE `', tbl_name, '` ADD COLUMN `', col_name, '` ', col_definition);
    PREPARE stmt FROM @alter_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_column_if_not_exists('donors',      'location_updated_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_not_exists('patients',    'location_updated_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_not_exists('hospitals',   'location_updated_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_not_exists('blood_banks', 'location_updated_at', 'DATETIME NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS add_column_if_not_exists;

SELECT 'GPS location_updated_at column migration complete.' AS status;
