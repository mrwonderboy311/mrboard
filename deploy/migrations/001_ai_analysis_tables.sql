-- Migration 001: AI 智能分析系统
-- Date: 2026-06-05
-- Description: 创建 AI 分析相关表 + 集群表新增 grafana_url 列

-- 1. LLM 模型配置表
CREATE TABLE IF NOT EXISTS llm_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider VARCHAR(64) DEFAULT 'anthropic',
    api_url VARCHAR(512) NOT NULL,
    api_key VARCHAR(512) NOT NULL,
    model VARCHAR(128) NOT NULL,
    max_tokens INT DEFAULT 4096,
    temperature FLOAT DEFAULT 0.3,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 分析历史表
CREATE TABLE IF NOT EXISTS analysis_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(32) NOT NULL,
    trigger_id VARCHAR(128),
    alert_name VARCHAR(255),
    severity VARCHAR(32),
    namespace VARCHAR(128),
    summary TEXT,
    root_cause TEXT,
    evidence_json TEXT,
    suggestions_json TEXT,
    model_used VARCHAR(128),
    tokens_used INT DEFAULT 0,
    rounds INT DEFAULT 0,
    feedback_score INT DEFAULT 0,
    feedback_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster (cluster_id),
    INDEX idx_trigger (trigger_type, trigger_id)
);

-- 3. 告警记忆表
CREATE TABLE IF NOT EXISTS alert_memory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL,
    alert_name VARCHAR(255),
    severity VARCHAR(32),
    cluster_id VARCHAR(64),
    namespace VARCHAR(128),
    analysis_json TEXT,
    feedback_score INT DEFAULT 0,
    feedback_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fingerprint (fingerprint)
);

-- 4. 集群知识表
CREATE TABLE IF NOT EXISTS knowledge (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster_category (cluster_id, category)
);

-- 5. 集群表新增 grafana_url 列
ALTER TABLE xkb_cluster ADD COLUMN grafana_url VARCHAR(500) DEFAULT '' AFTER prometheus_url;

-- 6. 集群表新增 loki_config 和 alertmanager_url 列（如果不存在）
ALTER TABLE xkb_cluster ADD COLUMN loki_config TEXT AFTER prometheus_url;
ALTER TABLE xkb_cluster ADD COLUMN alertmanager_url VARCHAR(500) DEFAULT '' AFTER loki_config;
