-- =============================================================================
-- LifeLink Complete Production Database Setup Script
-- Compatible with MySQL 8.0, TiDB Cloud Serverless, Aiven, Railway
-- =============================================================================

CREATE DATABASE IF NOT EXISTS lifelink_db;
USE lifelink_db;

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- 3. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    blood_group VARCHAR(5) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    medical_info TEXT,
    availability_status VARCHAR(20) DEFAULT 'Available',
    last_donation_date DATE NULL,
    next_eligible_date DATE NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    city VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    location_updated_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    blood_group VARCHAR(5) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    medical_info TEXT,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    city VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    location_updated_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    city VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    location_updated_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Blood Banks Table
CREATE TABLE IF NOT EXISTS blood_banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    city VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    location_updated_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Blood Inventory Table
CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    component VARCHAR(50) NOT NULL,
    volume_ml INT NOT NULL DEFAULT 0,
    units INT NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'Available',
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
);

-- 8. Blood Requests Table
CREATE TABLE IF NOT EXISTS blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    component VARCHAR(50) NOT NULL,
    volume_ml INT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(20) DEFAULT 'Pending',
    details TEXT,
    patient_name VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255) NULL,
    delivery_address TEXT NOT NULL,
    required_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Donations Table
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    blood_bank_id INT NOT NULL,
    donation_date DATE NOT NULL,
    volume_ml INT NOT NULL DEFAULT 450,
    status VARCHAR(20) DEFAULT 'Scheduled',
    certificate_path VARCHAR(255) NULL,
    qr_code_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
);

-- 10. Blood Tests Table
CREATE TABLE IF NOT EXISTS blood_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    test_date DATE NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    test_results JSON NOT NULL,
    status VARCHAR(20) DEFAULT 'Passed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
);

-- 11. Blood Distributions Table
CREATE TABLE IF NOT EXISTS blood_distributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    blood_inventory_id INT NOT NULL,
    distributed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (blood_inventory_id) REFERENCES blood_inventory(id) ON DELETE RESTRICT
);

-- 12. Blood Bank Requests Table (Patient -> Blood Bank direct requests)
CREATE TABLE IF NOT EXISTS blood_bank_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_user_id INT NOT NULL,
    blood_bank_id INT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    units_required INT NOT NULL DEFAULT 1,
    hospital_name VARCHAR(255) NULL,
    contact_number VARCHAR(20) NOT NULL,
    required_date DATE NOT NULL,
    emergency_notes TEXT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    rejection_reason TEXT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
);

-- 13. Hospital Blood Requests Table (Patient -> Hospital direct requests)
CREATE TABLE IF NOT EXISTS hospital_blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_user_id INT NOT NULL,
    hospital_id INT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    units_required INT NOT NULL DEFAULT 1,
    contact_number VARCHAR(20) NOT NULL,
    required_date DATE NOT NULL,
    emergency_notes TEXT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    rejection_reason TEXT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    request_id INT NULL,
    request_type VARCHAR(50) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. Donor Blood Requests Table (Patient -> Donor direct requests)
CREATE TABLE IF NOT EXISTS donor_blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    donor_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    request_status VARCHAR(20) DEFAULT 'Pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    donation_date DATE NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    patient_name VARCHAR(255) NOT NULL,
    patient_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
);

-- 16. Donation Certificates Table
CREATE TABLE IF NOT EXISTS donation_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_id VARCHAR(50) NOT NULL UNIQUE,
    donor_id INT NOT NULL,
    request_id INT NULL,
    patient_name VARCHAR(100),
    blood_group VARCHAR(10),
    donation_date DATE NOT NULL,
    units_donated INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES donor_blood_requests(id) ON DELETE SET NULL
);

-- 17. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Email Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_donors_blood_group ON donors(blood_group);
CREATE INDEX idx_patients_blood_group ON patients(blood_group);
CREATE INDEX idx_blood_inventory_group_comp ON blood_inventory(blood_group, component);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donor_blood_requests_donor ON donor_blood_requests(donor_id);
CREATE INDEX idx_donor_blood_requests_patient ON donor_blood_requests(patient_id);
CREATE INDEX idx_donor_blood_requests_status ON donor_blood_requests(request_status);
CREATE INDEX idx_donors_next_eligible ON donors(next_eligible_date);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Roles
INSERT IGNORE INTO roles (id, name) VALUES
(1, 'Admin'),
(2, 'Donor'),
(3, 'Patient'),
(4, 'Hospital'),
(5, 'Blood Bank Staff');

-- Users (Default password: 'password123' for all)
INSERT IGNORE INTO users (id, name, email, password, role_id, is_verified) VALUES
(1, 'System Admin', 'admin@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 1, TRUE),
(2, 'John Doe (Donor)', 'donor@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE),
(3, 'Alice Smith (Patient)', 'patient@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 3, TRUE),
(4, 'City General Hospital', 'hospital@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 4, TRUE),
(5, 'Red Cross Blood Bank Staff', 'staff@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 5, TRUE),
(6, 'Jane Miller (Donor O+)', 'jane@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE),
(7, 'Bob Johnson (Donor AB-)', 'bob@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE);

-- Donors with sample GPS coordinates
INSERT IGNORE INTO donors (user_id, blood_group, dob, gender, phone, address, medical_info, availability_status, last_donation_date, latitude, longitude, city, pincode) VALUES
(2, 'A+', '1990-05-15', 'Male', '+1234567890', '123 Main St, Springfield', 'No chronic illnesses, regular donor.', 'Available', '2026-03-01', 39.78170000, -89.65010000, 'Springfield', '62701'),
(6, 'O+', '1992-09-20', 'Female', '+1234567891', '456 Oak Ave, Springfield', 'None', 'Available', '2026-04-10', 39.79500000, -89.64400000, 'Springfield', '62702'),
(7, 'AB-', '1988-12-05', 'Male', '+1234567892', '789 Pine Rd, Springfield', 'Mild seasonal allergies.', 'Available', NULL, 39.77000000, -89.66500000, 'Springfield', '62703');

-- Patients
INSERT IGNORE INTO patients (user_id, blood_group, dob, gender, phone, address, medical_info, latitude, longitude, city, pincode) VALUES
(3, 'A+', '1995-02-28', 'Female', '+1987654321', '321 Elm St, Springfield', 'Anemia history.', 39.78800000, -89.65500000, 'Springfield', '62701');

-- Hospitals
INSERT IGNORE INTO hospitals (user_id, name, license_number, contact_person, phone, address, latitude, longitude, city, pincode) VALUES
(4, 'City General Hospital', 'HOSP-12345-SPRINGFIELD', 'Dr. Sarah Connor', '+18005550199', '500 Medical Parkway, Springfield', 39.80100000, -89.64300000, 'Springfield', '62704');

-- Blood Banks
INSERT IGNORE INTO blood_banks (user_id, name, license_number, contact_person, phone, address, latitude, longitude, city, pincode) VALUES
(5, 'Red Cross Blood Bank', 'BB-98765-SPRINGFIELD', 'Markus Wright', '+18005550299', '100 Blood Bank Rd, Springfield', 39.78500000, -89.65800000, 'Springfield', '62705');

-- Blood Inventory
INSERT IGNORE INTO blood_inventory (blood_bank_id, blood_group, component, volume_ml, units, status, expiry_date) VALUES
(1, 'A+', 'Whole Blood', 450, 1, 'Available', '2026-07-25'),
(1, 'A+', 'Plasma', 250, 1, 'Available', '2026-08-15'),
(1, 'O+', 'Platelets', 150, 1, 'Available', '2026-06-28'),
(1, 'O+', 'RBC', 300, 1, 'Available', '2026-07-30'),
(1, 'AB-', 'Whole Blood', 450, 1, 'Available', '2026-07-10'),
(1, 'B+', 'Whole Blood', 0, 0, 'Available', '2026-07-01');

-- Blood Requests
INSERT IGNORE INTO blood_requests (id, requester_id, blood_group, component, volume_ml, urgency, status, details, patient_name, hospital_name, delivery_address, required_date) VALUES
(1, 3, 'A+', 'Whole Blood', 450, 'Normal', 'Pending', 'Scheduled surgery request.', 'Alice Smith', 'City General Hospital', '500 Medical Parkway, Springfield', '2026-06-25'),
(2, 4, 'B+', 'Whole Blood', 450, 'Emergency', 'Pending', 'Critical trauma patient in ICU.', 'Unknown Patient', 'City General Hospital', '500 Medical Parkway, Springfield', '2026-06-21');

-- Donations
INSERT IGNORE INTO donations (id, donor_id, blood_bank_id, donation_date, volume_ml, status) VALUES
(1, 1, 1, '2026-03-01', 450, 'Completed'),
(2, 2, 1, '2026-04-10', 450, 'Completed');

-- Blood Tests
INSERT IGNORE INTO blood_tests (donation_id, test_date, blood_group, test_results, status) VALUES
(1, '2026-03-02', 'A+', '{"hiv": "Negative", "hepB": "Negative", "hepC": "Negative", "syphilis": "Negative"}', 'Passed'),
(2, '2026-04-11', 'O+', '{"hiv": "Negative", "hepB": "Negative", "hepC": "Negative", "syphilis": "Negative"}', 'Passed');
