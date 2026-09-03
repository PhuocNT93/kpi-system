# Step 2 - Investigate

Status: reconstructed from approved response

## Deliverable

### Relevant Documents
1. ✓ LLD §12 - Rule Engine — Hybrid Decision Table + Strategy Pattern design, 5 rule types, pseudocode, testing strategy
2. ✓ BACKEND_NODE_RULES §2-3 — Module architecture, domain invariants, rule strategies, validation requirements
3. ✓ LLD §6, §18 — Scoring rule JSON structure, measurement model, raw score persistence
4. ✓ Attachment: Comprehensive Rule Engine specification with detailed contract, all five rule types, boundary testing requirements, configuration validation, error model, and test matrix

### Relevant Modules and Files

**Existing Module Structure (patterns to follow):**
- Module template: `{module}/{api/,application/,domain/,infrastructure/}`
- Configuration module: `backend/src/modules/configuration/`
- KPI module: `backend/src/modules/kpi/`
- Audit module: `backend/src/modules/audit/`

**Key Existing Patterns:**
- Module interface export (`configuration.module.ts`) — centralizes repositories and services
- Service classes (`scoring-rule.service.ts`) — inject repositories, business logic, error handling
- Validators (`scoring-rule.validator.ts`) — static methods, return error array
- Error classes (`app-error.ts`) — typed domain errors with status/code/field/details
- Tests (`kpi-relationship.test.ts`) — vitest, beforeAll/afterAll, table-driven data, pool cleanup

### Existing Implementation (ScoringRuleValidator)

The configuration module already contains `ScoringRuleValidator` which validates `rule_type` and `config` structure for all five rule types. This proves:
- Zod is available
- The five rule types exist as enum
- Validation errors follow the `ValidationErrorDetail` shape: `{ code, path, message }`
- Configuration types are already defined

### Existing Tests
- Pattern: vitest + integration tests
- Setup: `beforeAll` (pool create), `afterEach`/`beforeEach` (cleanup), `afterAll` (pool end)
- Pattern: `.runIf(isDbAvailable)` for conditional execution

### Patterns to Reuse

| What | Where | Pattern |
|---|---|---|
| Error types | api/app-error.ts | AppError subclasses with (status, code, message, field, details) |
| Zod validation | audit/domain/audit.domain.ts | z.enum(), z.infer<typeof Schema>, schema export + type alias |
| Service constructor | scoring-rule.service.ts | Inject dependencies, public methods return domain objects or throw AppError |
| Test setup | kpi-relationship.test.ts | vitest describe.runIf(), Pool, beforeAll/afterAll/beforeEach |
| Validator structure | scoring-rule.validator.ts | Static class, method per rule type, collect errors array |
| TypeScript config | tsconfig.json | "strict": true, "noUncheckedIndexedAccess": true |

### Determination

**This is a new, isolated module with no existing Rule Engine implementation.** The configuration module has validators for rule structure but does NOT have:
- Rule resolution engine
- Strategy implementations
- Test data generators
- Factory/registry

**Module will be created as:** `backend/src/modules/rule-engine/` following the module pattern.
