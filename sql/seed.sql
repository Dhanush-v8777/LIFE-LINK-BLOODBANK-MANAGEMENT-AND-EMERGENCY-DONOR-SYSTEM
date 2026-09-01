-- Seed Data for LifeLink Blood Bank Management System
USE lifelink_db;

-- Insert Roles
INSERT INTO roles (id, name) VALUES
(1, 'Admin'),
(2, 'Donor'),
(3, 'Patient'),
(4, 'Hospital'),
(5, 'Blood Bank Staff');

-- Insert Users (Password is 'password123' for all)
-- Hash for 'password123': $2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu
INSERT INTO users (id, name, email, password, role_id, is_verified) VALUES
(1, 'System Admin', 'admin@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 1, TRUE),
(2, 'John Doe (Donor)', 'donor@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE),
(3, 'Alice Smith (Patient)', 'patient@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 3, TRUE),
(4, 'City General Hospital', 'hospital@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 4, TRUE),
(5, 'Red Cross Blood Bank Staff', 'staff@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 5, TRUE),
(6, 'Jane Miller (Donor O+)', 'jane@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE),
(7, 'Bob Johnson (Donor AB-)', 'bob@lifelink.com', '$2a$10$Y/9Baf50wcpbNpOjddDZwOFhde7S4yyMSiOaHqEHs2eNlOZT0oMCu', 2, TRUE);

-- Insert Donors
INSERT INTO donors (user_id, blood_group, dob, gender, phone, address, medical_info, availability_status, last_donation_date) VALUES
(2, 'A+', '1990-05-15', 'Male', '+1234567890', '123 Main St, Springfield', 'No chronic illnesses, regular donor.', 'Available', '2026-03-01'),
(6, 'O+', '1992-09-20', 'Female', '+1234567891', '456 Oak Ave, Springfield', 'None', 'Available', '2026-04-10'),
(7, 'AB-', '1988-12-05', 'Male', '+1234567892', '789 Pine Rd, Springfield', 'Mild seasonal allergies.', 'Available', NULL);

-- Insert Patients
INSERT INTO patients (user_id, blood_group, dob, gender, phone, address, medical_info) VALUES
(3, 'A+', '1995-02-28', 'Female', '+1987654321', '321 Elm St, Springfield', 'Anemia history.');

-- Insert Hospitals
INSERT INTO hospitals (user_id, name, license_number, contact_person, phone, address) VALUES
(4, 'City General Hospital', 'HOSP-12345-SPRINGFIELD', 'Dr. Sarah Connor', '+18005550199', '500 Medical Parkway, Springfield');

-- Insert Blood Banks
INSERT INTO blood_banks (user_id, name, license_number, contact_person, phone, address) VALUES
(5, 'Red Cross Blood Bank', 'BB-98765-SPRINGFIELD', 'Markus Wright', '+18005550299', '100 Blood Bank Rd, Springfield');

-- Insert Blood Inventory
INSERT INTO blood_inventory (blood_bank_id, blood_group, component, volume_ml, units, status, expiry_date) VALUES
(1, 'A+', 'Whole Blood', 450, 1, 'Available', '2026-07-25'),
(1, 'A+', 'Plasma', 250, 1, 'Available', '2026-08-15'),
(1, 'O+', 'Platelets', 150, 1, 'Available', '2026-06-28'),
(1, 'O+', 'RBC', 300, 1, 'Available', '2026-07-30'),
(1, 'AB-', 'Whole Blood', 450, 1, 'Available', '2026-07-10'),
(1, 'B+', 'Whole Blood', 0, 0, 'Available', '2026-07-01'); -- Out of stock example

-- Insert Blood Requests
INSERT INTO blood_requests (id, requester_id, blood_group, component, volume_ml, urgency, status, details, patient_name, hospital_name, delivery_address, required_date) VALUES
(1, 3, 'A+', 'Whole Blood', 450, 'Normal', 'Pending', 'Scheduled surgery request.', 'Alice Smith', 'City General Hospital', '500 Medical Parkway, Springfield', '2026-06-25'),
(2, 4, 'B+', 'Whole Blood', 450, 'Emergency', 'Pending', 'Critical trauma patient in ICU.', 'Unknown Patient', 'City General Hospital', '500 Medical Parkway, Springfield', '2026-06-21');

-- Insert Donations
INSERT INTO donations (id, donor_id, blood_bank_id, donation_date, volume_ml, status) VALUES
(1, 1, 1, '2026-03-01', 450, 'Completed'),
(2, 2, 1, '2026-04-10', 450, 'Completed');

-- Insert Blood Tests
INSERT INTO blood_tests (donation_id, test_date, blood_group, test_results, status) VALUES
(1, '2026-03-02', 'A+', '{"hiv": "Negative", "hepB": "Negative", "hepC": "Negative", "syphilis": "Negative"}', 'Passed'),
(2, '2026-04-11', 'O+', '{"hiv": "Negative", "hepB": "Negative", "hepC": "Negative", "syphilis": "Negative"}', 'Passed');
