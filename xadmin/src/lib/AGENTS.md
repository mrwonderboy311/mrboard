<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# lib

## Purpose
Utility library providing shared helper functions for the admin system: JSON conversion, counter initialization, password handling, and template functions.

## Key Files
| File | Description |
|------|-------------|
| `lib.go` | Utility functions — `StringsToJson()` for template use, `InitCnt()` for login failure counters, password hashing, general helpers |

## For AI Agents

### Working In This Directory
- Package is imported with dot import (`. "xkube/xadmin/src/lib"`) in `admin.go`, making all exported functions available directly
- `StringsToJson` is registered as a Beego template function for use in HTML templates
- `InitCnt()` initializes Redis-based counters for login failure tracking

### Common Patterns
- Functions are designed to be used globally via the dot import pattern

## Dependencies

### Internal
- `common/redis_lib.go` - Redis client for counter operations

<!-- MANUAL: -->
