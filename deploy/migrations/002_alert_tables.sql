-- Migration 002: 告警系统表
-- Date: 2026-06-05
-- Description: 创建告警规则、通知渠道、告警历史表

-- 1. 告警规则表
CREATE TABLE IF NOT EXISTS alert_rule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    expr TEXT NOT NULL,
    source VARCHAR(32) DEFAULT 'prometheus',
    duration VARCHAR(32) DEFAULT '5m',
    severity VARCHAR(32) DEFAULT 'warning',
    labels TEXT,
    annotations TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster (cluster_id)
);

-- 2. 告警通知渠道表
CREATE TABLE IF NOT EXISTS alert_channel (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) DEFAULT 'webhook',
    url VARCHAR(512) NOT NULL,
    headers TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 告警历史表
CREATE TABLE IF NOT EXISTS alert_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    rule_name VARCHAR(255),
    severity VARCHAR(32),
    status VARCHAR(32),
    labels TEXT,
    annotations TEXT,
    starts_at DATETIME,
    ends_at DATETIME,
    notified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster (cluster_id),
    INDEX idx_severity (severity)
);

-- 4. 设置 alertmanager_url（根据实际地址修改）
-- UPDATE xkb_cluster SET alertmanager_url='http://kps-kube-prometheus-stack-alertmanager.observability.svc.cluster.local:9093' WHERE cluster_id='local-cluster';
