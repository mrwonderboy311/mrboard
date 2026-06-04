ALTER TABLE xkb_cluster ADD COLUMN loki_url VARCHAR(255) DEFAULT '';

-- Add 日志查看 group (id=8) and top-level menu node for RBAC
INSERT INTO `group` (`id`, `name`, `title`, `status`, `sort`) VALUES (8, 'log', '日志查看', 2, 7);
INSERT INTO `node` (`id`, `title`, `name`, `level`, `pid`, `icons`, `sorts`, `remark`, `status`, `group_id`) VALUES (380, '日志查看', 'logViewer', 1, 0, 'layui-icon-file', 50, 'Loki日志查看器', 2, 8);
