-- Migration: Nearby Search Feature - Add geolocation columns
-- Run this against lifelink_db
-- This migration is ADDITIVE ONLY - no existing columns or data are modified.
-- Compatible with MySQL 8.0 (no IF NOT EXISTS for ADD COLUMN)

USE lifelink_db;

-- Helper procedure to safely add columns (skips if column already exists)
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

-- 1. Add geolocation columns to donors table
CALL add_column_if_not_exists('donors', 'latitude', 'DECIMAL(10,8) NULL');
CALL add_column_if_not_exists('donors', 'longitude', 'DECIMAL(11,8) NULL');
CALL add_column_if_not_exists('donors', 'city', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('donors', 'pincode', 'VARCHAR(10) NULL');

-- 2. Add geolocation columns to hospitals table
CALL add_column_if_not_exists('hospitals', 'latitude', 'DECIMAL(10,8) NULL');
CALL add_column_if_not_exists('hospitals', 'longitude', 'DECIMAL(11,8) NULL');
CALL add_column_if_not_exists('hospitals', 'city', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('hospitals', 'pincode', 'VARCHAR(10) NULL');

-- 3. Add geolocation columns to blood_banks table
CALL add_column_if_not_exists('blood_banks', 'latitude', 'DECIMAL(10,8) NULL');
CALL add_column_if_not_exists('blood_banks', 'longitude', 'DECIMAL(11,8) NULL');
CALL add_column_if_not_exists('blood_banks', 'city', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('blood_banks', 'pincode', 'VARCHAR(10) NULL');

-- 4. Add geolocation columns to patients table
CALL add_column_if_not_exists('patients', 'latitude', 'DECIMAL(10,8) NULL');
CALL add_column_if_not_exists('patients', 'longitude', 'DECIMAL(11,8) NULL');
CALL add_column_if_not_exists('patients', 'city', 'VARCHAR(100) NULL');
CALL add_column_if_not_exists('patients', 'pincode', 'VARCHAR(10) NULL');

-- Clean up the helper procedure
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- 5. Update seed data with sample coordinates (Springfield, IL area)
UPDATE donors SET latitude = 39.78170000, longitude = -89.65010000, city = 'Springfield', pincode = '62701' WHERE user_id = 2;
UPDATE donors SET latitude = 39.79500000, longitude = -89.64400000, city = 'Springfield', pincode = '62702' WHERE user_id = 6;
UPDATE donors SET latitude = 39.77000000, longitude = -89.66500000, city = 'Springfield', pincode = '62703' WHERE user_id = 7;
UPDATE hospitals SET latitude = 39.80100000, longitude = -89.64300000, city = 'Springfield', pincode = '62704' WHERE user_id = 4;
UPDATE blood_banks SET latitude = 39.78500000, longitude = -89.65800000, city = 'Springfield', pincode = '62705' WHERE user_id = 5;
UPDATE patients SET latitude = 39.78800000, longitude = -89.65500000, city = 'Springfield', pincode = '62701' WHERE user_id = 3;
