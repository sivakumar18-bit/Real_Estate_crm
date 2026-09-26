CREATE DATABASE IF NOT EXISTS real_estate_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE real_estate_crm;

CREATE TABLE IF NOT EXISTS users(
 id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(150) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,role ENUM('ADMIN','SALES') NOT NULL DEFAULT 'SALES',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS leads(
 id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120) NOT NULL,phone VARCHAR(30) NOT NULL,email VARCHAR(150),
 source VARCHAR(80),stage ENUM('New','Contacted','Site Visit','Interested','Negotiation','Booked','Lost') DEFAULT 'New',
 assigned_to INT NULL,notes TEXT,follow_up_date DATE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE SET NULL);

CREATE TABLE IF NOT EXISTS projects(
 id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(150) NOT NULL,lyyocation VARCHAR(255),description TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS buildings(
 id INT AUTO_INCREMENT PRIMARY KEY,project_id INT NOT NULL,name VARCHAR(120) NOT NULL,floors INT DEFAULT 1,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS units(
 id INT AUTO_INCREMENT PRIMARY KEY,building_id INT NOT NULL,unit_no VARCHAR(50) NOT NULL,
 unit_type VARCHAR(80) NOT NULL,price DECIMAL(15,2) NOT NULL,status ENUM('AVAILABLE','BOOKED') DEFAULT 'AVAILABLE',
 UNIQUE KEY uq_unit(building_id,unit_no),FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS bookings(
 id INT AUTO_INCREMENT PRIMARY KEY,lead_id INT NOT NULL,unit_id INT NOT NULL,booked_by INT NOT NULL,
 amount DECIMAL(15,2) NOT NULL,booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 status ENUM('CONFIRMED','CANCELLED') DEFAULT 'CONFIRMED',
 FOREIGN KEY(lead_id) REFERENCES leads(id),FOREIGN KEY(unit_id) REFERENCES units(id),
 FOREIGN KEY(booked_by) REFERENCES users(id));

INSERT IGNORE INTO users(name,email,password_hash,role) VALUES
('System Admin','admin@crm.local','TEMP_ADMIN','ADMIN'),
('Sales Employee','sales@crm.local','TEMP_SALES','SALES');

INSERT INTO projects(name,location,description)
SELECT 'Green Valley Residency','Chennai','Demo residential project'
WHERE NOT EXISTS(SELECT 1 FROM projects WHERE name='Green Valley Residency');

INSERT INTO buildings(project_id,name,floors)
SELECT id,'Tower A',10 FROM projects
WHERE name='Green Valley Residency'
AND NOT EXISTS(SELECT 1 FROM buildings WHERE name='Tower A');

INSERT INTO units(building_id,unit_no,unit_type,price,status)
SELECT id,'A-101','2 BHK',6500000,'AVAILABLE' FROM buildings
WHERE name='Tower A' AND NOT EXISTS(SELECT 1 FROM units WHERE unit_no='A-101');

INSERT INTO units(building_id,unit_no,unit_type,price,status)
SELECT id,'A-102','3 BHK',8200000,'AVAILABLE' FROM buildings
WHERE name='Tower A' AND NOT EXISTS(SELECT 1 FROM units WHERE unit_no='A-102');
