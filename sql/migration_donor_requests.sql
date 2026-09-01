-- Migration: Donor Blood Request System & 56-Day Eligibility Rule
-- Run this against lifelink_db

USE lifelink_db;

-- 1. Add next_eligible_date to donors table
ALTER TABLE donors 
  ADD COLUMN IF NOT EXISTS next_eligible_date DATE NULL COMMENT '56-day cooldown ends on this date';

-- 2. Create donor_blood_requests table (patient -> donor direct requests)
CREATE TABLE IF NOT EXISTS donor_blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    donor_id INT NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    request_status VARCHAR(20) DEFAULT 'Pending',  -- Pending, Accepted, Rejected, Completed, Cancelled
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_donor_blood_requests_donor ON donor_blood_requests(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_blood_requests_patient ON donor_blood_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_donor_blood_requests_status ON donor_blood_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_donors_next_eligible ON donors(next_eligible_date);
