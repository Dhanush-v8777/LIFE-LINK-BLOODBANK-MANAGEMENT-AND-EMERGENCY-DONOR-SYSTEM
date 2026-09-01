-- Database Schema for LifeLink Blood Bank Management System

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Blood Inventory Table
CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_bank_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    component VARCHAR(50) NOT NULL, -- 'Whole Blood', 'Plasma', 'Platelets', 'RBC'
    volume_ml INT NOT NULL DEFAULT 0,
    units INT NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'Available', -- 'Available', 'Reserved', 'Expired'
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
    component VARCHAR(50) NOT NULL, -- 'Whole Blood', 'Plasma', 'Platelets', 'RBC'
    volume_ml INT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'Normal', -- 'Normal', 'Emergency'
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'
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
    status VARCHAR(20) DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled'
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
    test_results JSON NOT NULL, -- HIV, HepB, HepC, Syphilis screen
    status VARCHAR(20) DEFAULT 'Passed', -- 'Passed', 'Failed'
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
    status VARCHAR(30) DEFAULT 'Pending',  -- 'Pending', 'Accepted', 'Rejected', 'Completed'
    rejection_reason TEXT NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Email', 'System'
    status VARCHAR(20) DEFAULT 'Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Donor Blood Requests Table (Patient -> Donor direct requests)
CREATE TABLE IF NOT EXISTS donor_blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    donor_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    request_status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'
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

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Email Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. OTP Verifications Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Registration', 'PasswordReset', 'EmergencyResponse'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_donors_blood_group ON donors(blood_group);
CREATE INDEX idx_patients_blood_group ON patients(blood_group);
CREATE INDEX idx_blood_inventory_group_comp ON blood_inventory(blood_group, component);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_donor_blood_requests_donor ON donor_blood_requests(donor_id);
CREATE INDEX idx_donor_blood_requests_patient ON donor_blood_requests(patient_id);
CREATE INDEX idx_donor_blood_requests_status ON donor_blood_requests(request_status);
CREATE INDEX idx_donors_next_eligible ON donors(next_eligible_date);
