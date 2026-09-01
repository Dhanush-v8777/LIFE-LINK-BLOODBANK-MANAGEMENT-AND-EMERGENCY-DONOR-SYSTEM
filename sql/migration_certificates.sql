CREATE TABLE IF NOT EXISTS donation_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certificate_id VARCHAR(50) NOT NULL UNIQUE,
  donor_id INT NOT NULL,
  request_id INT,
  patient_name VARCHAR(100),
  blood_group VARCHAR(10),
  donation_date DATE NOT NULL,
  units_donated INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES donor_blood_requests(id) ON DELETE SET NULL
);
