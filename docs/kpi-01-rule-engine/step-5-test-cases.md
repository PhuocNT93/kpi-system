# Step 5 - Define Test Cases

Status: reconstructed from approved response

## Deliverable

### Test Organization

Tests are organized into files:
- `rule-engine.test.ts` — Engine entry point integration tests
- `range-threshold.strategy.test.ts` — RANGE_THRESHOLD strategy
- `inverse-threshold.strategy.test.ts` — INVERSE_THRESHOLD strategy
- `count-threshold.strategy.test.ts` — COUNT_THRESHOLD strategy
- `ordinal-manual.strategy.test.ts` — ORDINAL_MANUAL strategy
- `role-conditional.strategy.test.ts` — ROLE_CONDITIONAL strategy
- `strategy.registry.test.ts` — Registry resolution
- `rule-config.validator.test.ts` — Configuration validation
- `rule-engine.purity.test.ts` — Statelessness and concurrency

### Test Coverage Matrix

| Rule Type | Happy Path | Boundaries | Null | Out-of-Range | Invalid Config | Role Branch |
|---|---|---|---|---|---|---|
| RANGE_THRESHOLD | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| INVERSE_THRESHOLD | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| COUNT_THRESHOLD | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| ORDINAL_MANUAL | ✓ | N/A | ✓ | N/A | ✓ | — |
| ROLE_CONDITIONAL | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Test Count Summary

- RANGE_THRESHOLD: 18 test cases
- INVERSE_THRESHOLD: 13 test cases
- COUNT_THRESHOLD: 16 test cases
- ORDINAL_MANUAL: 7 test cases
- ROLE_CONDITIONAL: 17 test cases
- Configuration Validator: 11 test cases
- Strategy Registry: 7 test cases
- Engine Integration: 10 test cases
- Purity & Statelessness: 10 test cases
- Regression: 3 test cases

**Total: ~112 test cases** across ~9 test files

### Representative Test Scenarios

**RANGE_THRESHOLD:**
- Happy path: values in various buckets
- Boundaries: exact min/max, adjacent values
- Null measurement
- Out-of-range (negative, exceeds max)
- Invalid config (overlapping ranges, min>max, missing fields)

**INVERSE_THRESHOLD:**
- Happy path: low/medium/high incident counts
- Boundaries: exact thresholds, values between
- Null measurement
- Negative count (invalid)
- Invalid config (overlap, empty array)

**COUNT_THRESHOLD:**
- Happy path: counts at/below/above thresholds
- Boundaries: exact threshold values
- Null measurement
- Negative count
- Invalid config (unsorted, duplicates, empty)

**ORDINAL_MANUAL:**
- Always returns manual-review=true
- Handles any measurement (including null)
- Config-only validation
- No database lookup

**ROLE_CONDITIONAL:**
- Matching first/other roles
- Unknown role (no branch found)
- Null role
- Nested rule delegation (RANGE_THRESHOLD, COUNT_THRESHOLD, ORDINAL_MANUAL)
- Duplicate role branches (invalid)
- Recursive nesting
- Empty branches (invalid)

**Validator:**
- Valid configs for each rule type
- Missing config object
- Invalid rule type
- Min > max
- Overlapping ranges
- Missing required fields
- Non-numeric values

**Registry:**
- All 5 types registered
- Unknown type throws error
- Singleton or new instance behavior

**Engine Integration:**
- Full RuleInput → RuleResult contract
- Invalid config detection
- Null measurement handling
- Out-of-range handling
- Unsupported rule type
- Role requirement for ROLE_CONDITIONAL

**Purity & Statelessness:**
- Repeated calls produce same result
- Multiple engine instances produce same result
- No shared state across calls
- Concurrent execution safety
- No database access
- No HTTP calls
- No clock dependency
- No global state mutation
- No environment variable dependency
- No user context dependency
