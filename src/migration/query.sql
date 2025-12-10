DROP DATABASE IF EXISTS thodung;
CREATE DATABASE thodung CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE thodung;

-- ==========================
-- USERS
-- ==========================
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_card VARCHAR(20),
  avatar_link VARCHAR(255) DEFAULT 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  role ENUM('customer','technician','admin') DEFAULT 'customer',
  status ENUM('active','inactive') DEFAULT 'active',
  verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expiry DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_devices (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    fcm_token TEXT ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);




-- ALTER TABLE users 
-- MODIFY COLUMN 
-- status ENUM('active','inactive') DEFAULT 'active';

-- ==========================
-- SERVICE CATEGORIES
-- ==========================
CREATE TABLE service_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  color VARCHAR(10) DEFAULT '#4A90E2',
  `order` INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
      ON UPDATE CURRENT_TIMESTAMP
);

-- ALTER TABLE service_categories 
-- MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active';



-- ========================== -- TECHNICIAN PROFILES -- ========================== -- ========================== -- 
 CREATE TABLE technician_profiles ( 
id VARCHAR(50) PRIMARY KEY,
 user_id VARCHAR(50) NOT NULL, 
 experience_years INT DEFAULT 0, -- Số năm kinh nghiệm 
 working_area VARCHAR(255), -- Khu vực làm việc 
 rating_avg DECIMAL(2,1) DEFAULT 0.0, -- Điểm trung bình đánh giá 
 description TEXT, -- Mô tả chi tiết kỹ năng 
 certifications TEXT, -- Bằng cấp, chứng chỉ 
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
 FOREIGN KEY (user_id) REFERENCES users(id)
 );
 
 
 CREATE TABLE technician_profile_skills (
  id VARCHAR(50) PRIMARY KEY,
  profile_id VARCHAR(50) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES technician_profiles(id),
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

 
 
 -- Thêm vào file SQL của anh (sau bảng technician_profiles)
CREATE TABLE technician_requests (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  experience_years INT DEFAULT 0,
  working_area VARCHAR(255),
  description TEXT,
  certifications TEXT,
  type ENUM('new', 'update') DEFAULT 'new',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejected_reason TEXT NULL,
  approved_by VARCHAR(50) NULL,
  rejected_by VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (rejected_by) REFERENCES users(id)
);



-- ==========================
-- SERVICES
-- ==========================
CREATE TABLE services (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price VARCHAR(20) DEFAULT '0',
  unit VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);


-- ==========================
-- REQUESTS
-- ==========================
CREATE TABLE requests (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  service_id VARCHAR(50) NOT NULL,
  name_request VARCHAR(255),
  description TEXT,
  address VARCHAR(255),
  requested_date VARCHAR(10),
  requested_time VARCHAR(10), 
  status ENUM('pending', 'assigning', 'assigned', 'quoted', 'in_progress', 'customer_review',  'payment', 'payment_review', 'completed', 'cancelled', 'maintenance') DEFAULT 'pending',
  cancel_reason TEXT NULL,
  cancel_by VARCHAR(50) NULL,
  completed_at DATETIME NULL,
  technician_id VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (technician_id) REFERENCES users(id),
  FOREIGN KEY (cancel_by) REFERENCES users(id)
);


CREATE TABLE technician_request_skills (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (request_id) REFERENCES technician_requests(id),
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);


-- ALTER TABLE requests 
-- MODIFY COLUMN 
-- status ENUM('pending', 'assigning', 'assigned', 'quoted', 'in_progress', 'customer_review', 'payment', 'payment_review', 'completed', 'cancelled', 'maintenance') DEFAULT 'pending'
-- DEFAULT 'pending';


-- ==========================
-- REQUEST IMAGES
-- ==========================
CREATE TABLE request_images (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  type ENUM('pending','survey', "completed") DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
-- ALTER TABLE request_images 
-- MODIFY COLUMN type 
-- ENUM('pending','survey', 'completed') 
-- DEFAULT 'pending';
-- ==========================
-- QUOTATIONS
-- ==========================
CREATE TABLE quotations (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  technician_id VARCHAR(50) NOT NULL,
  total_price DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE quotation_items (
  id VARCHAR(50) PRIMARY KEY,
  quotation_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  note TEXT,
  report_by VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  FOREIGN KEY (report_by) REFERENCES users(id)
);

CREATE TABLE quotation_items_images (
  id VARCHAR(50) PRIMARY KEY,
  quotation_item_id VARCHAR(50) NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  image_type ENUM('before', 'during', 'after') DEFAULT 'after',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
-- ALTER TABLE quotation_items_images 
-- MODIFY COLUMN  
-- image_type ENUM('before', 'during', 'after') DEFAULT 'after'

CREATE TABLE quotation_items_logs (
  id VARCHAR(255) PRIMARY KEY,
  quotation_item_id VARCHAR(50) NOT NULL,
  old_status ENUM('pending', 'in_progress', 'completed') NULL,
  new_status ENUM('pending', 'in_progress', 'completed') NOT NULL,
  note TEXT,
  changed_by VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);


-- ==========================
-- PAYMENTS
-- ==========================
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('qr', 'cash') DEFAULT 'qr',
  payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  transaction_id VARCHAR(100),
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

CREATE TABLE payment_proofs (
  id VARCHAR(50) PRIMARY KEY,
  payment_id VARCHAR(50) NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);


-- ==========================
-- REVIEWS
-- ==========================
CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  technician_id VARCHAR(50) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- ==========================
-- REQUEST ASSIGNMENTS
-- ==========================
CREATE TABLE request_assignments (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  old_technician_id VARCHAR(50),
  new_technician_id VARCHAR(50) NOT NULL,
  assigned_by VARCHAR(50) NOT NULL,
  reason TEXT,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (old_technician_id) REFERENCES users(id),
  FOREIGN KEY (new_technician_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- ==========================
-- REQUEST STATUS LOGS
-- ==========================
CREATE TABLE request_status_logs (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ==========================
-- MAINTENANCE REQUESTS
-- ==========================
CREATE TABLE maintenance_requests (
  id VARCHAR(50) PRIMARY KEY,
  original_request_id VARCHAR(50) NOT NULL,
  technician_id VARCHAR(50),
  description TEXT,
  status ENUM('pending','in_progress','completed') DEFAULT 'pending',
  created_by VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (original_request_id) REFERENCES requests(id),
  FOREIGN KEY (technician_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ==========================
-- COMPLAINTS
-- ==========================
CREATE TABLE complaints (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  complainant_id VARCHAR(50) NOT NULL,
  against_id VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  status ENUM('pending','reviewing','resolved','rejected') DEFAULT 'pending',
  resolution TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (complainant_id) REFERENCES users(id),
  FOREIGN KEY (against_id) REFERENCES users(id)
);

-- ==========================
-- NOTIFICATIONS
-- ==========================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type ENUM(
		'system',
		'request_cancel',
		'request_technician_approved',
		'request_technician_rejected',
		'request_technician',
		'new_request',
		'assign_job',
		'quote_from_worker',
		'quote_approved',
		'quote_rejected',
		'report_job',
		'accept_inspection',
		'reject_inspection',
		'payment',
		'payment_approved',
		'technician_accept_assign',
		'technician_reject_assign'
	) DEFAULT 'system',
    action_data JSON NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
ALTER TABLE notifications 
MODIFY type ENUM(
    'system',
    'request_cancel',
    'request_technician_approved',
    'request_technician_rejected',
    'request_technician',
    'new_request',
    'assign_job',
    'quote_from_worker',
    'quote_approved',
    'quote_rejected',
    'report_job',
    'accept_inspection',
    'reject_inspection',
    'payment',
    'payment_approved',
    'technician_accept_assign',
    'technician_reject_assign'
) DEFAULT 'system';

