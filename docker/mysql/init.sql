CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_refresh (refresh_token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  original_name VARCHAR(512) NOT NULL,
  extension VARCHAR(64) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_at DATETIME NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  UNIQUE KEY uq_files_storage_key (storage_key),
  INDEX idx_files_user (user_id),
  CONSTRAINT fk_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
