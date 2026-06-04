<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# conf

## Purpose
Beego application configuration directory. Contains the main `app.conf` INI-format config file with database, Redis, session, RBAC, and Aliyun SMS settings.

## Key Files
| File | Description |
|------|-------------|
| `app.conf` | Main configuration: MySQL connection, Redis address, session settings, RBAC auth rules, Aliyun SMS config, file upload paths, API keys |

## For AI Agents

### Working In This Directory
- This is a Beego INI config file — sections are not used, keys are flat
- Key config groups:
  - **Database**: `db_host`, `db_port`, `db_user`, `db_pass`, `db_name`, `db_type`
  - **Redis**: `redisDb`, `redisPasswd`, `SessionProviderConfig`
  - **RBAC**: `rbac_admin_user`, `not_auth_package`, `user_auth_type`, `rbac_auth_gateway`
  - **Security**: `max_login_fail_user`, `max_login_fail_ip`, `user_lock_time`, `ip_lock_time`
  - **Aliyun SMS**: `mobile_verify_code`, `AliyunAkId`, `AliyunAkSecret`, `SignName`, `TemplateCode`
  - **Upload**: `rootPath`, `uploadPath`, `domain`
- `not_auth_package = public,index,task` means these route prefixes skip RBAC authentication
- `template_type=front` tells Beego to serve templates from `views/front/`
- Template delimiters are `<<<` and `>>>` (not the default `{{` `}}`)

### Common Patterns
- Changes require application restart — Beego does not hot-reload config
- Environment-specific values (DB host, Redis) should be overridden per deployment

<!-- MANUAL: -->
