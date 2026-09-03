# Step 4 - Plan

Status: reconstructed from approved response

## Deliverable

### Implementation Plan

#### 1. Create domain/error types
**What:** Error classes for Rule Engine domain errors  
**Where:** `backend/src/modules/rule-engine/domain/rule-engine.errors.ts`  
**Why:** Distinguish validation errors, unsupported types, measurement issues, role issues.  
**Tests:** None (errors tested implicitly in strategy tests)  

#### 2. Create domain/rule types and input/output contracts
**What:** TypeScript types for RuleType, RuleInput, RuleResult, threshold/range/branch structures  
**Where:** `backend/src/modules/rule-engine/domain/rule.types.ts`  
**Why:** Establish the pure engine contract. Discriminated unions for config types.  
**Tests:** Type check only  

#### 3. Create strategy interface and base implementation
**What:** Generic RuleStrategy<TConfig> interface with evaluate() method  
**Where:** `backend/src/modules/rule-engine/domain/rule.strategy.ts`  
**Why:** Single responsibility. Each concrete strategy implements one rule type's logic.  
**Tests:** No tests  

#### 4. Implement five concrete strategies
**What:**  
- RangeThresholdStrategy
- InverseThresholdStrategy
- CountThresholdStrategy
- OrdinalManualStrategy
- RoleConditionalStrategy

**Where:** `backend/src/modules/rule-engine/strategies/{range-threshold,inverse-threshold,count-threshold,ordinal-manual,role-conditional}.strategy.ts`  
**Why:** Isolated implementation. Testable independently.  
**Tests:** Table-driven tests per strategy  

#### 5. Create strategy registry/factory
**What:** Central registry mapping RuleType → strategy instance. Factory method to resolve strategy.  
**Where:** `backend/src/modules/rule-engine/strategies/strategy.registry.ts`  
**Why:** Decouple strategy resolution. Enable ROLE_CONDITIONAL delegation.  
**Tests:** Registry test  

#### 6. Create configuration validator
**What:** Runtime validation for rule_config per rule type.  
**Where:** `backend/src/modules/rule-engine/application/rule-config.validator.ts`  
**Why:** Validate before engine evaluation.  
**Tests:** Validation test per rule type  

#### 7. Create main Rule Engine class
**What:** Public RuleEngine class with resolve(input: RuleInput): RuleResult method.  
**Where:** `backend/src/modules/rule-engine/domain/rule-engine.ts`  
**Why:** Entry point. Stateless. Coordinates validation → strategy lookup → evaluation.  
**Tests:** Integration tests  

#### 8. Create module interface and factory
**What:** RuleEngineModule interface and createRuleEngineModule() factory.  
**Where:** `backend/src/modules/rule-engine/rule-engine.module.ts`  
**Why:** Follow module pattern. Enable dependency injection.  
**Tests:** No tests  

#### 9. Create comprehensive test suite
**What:** Unit tests per strategy + registry + validator + integration + purity tests.  
**Where:** `backend/test/rule-engine.*.test.ts`  
**Why:** Satisfy acceptance criterion.  
**Tests:** ~15-20 test files  

#### 10. Ensure TypeScript strict + ESLint compliance
**What:** TypeScript compilation, linting pass.  
**Where:** All files  
**Tests:** npm run typecheck, npm run lint  

#### 11. Verify no existing tests break
**What:** Run full test suite.  
**Where:** All test files  
**Tests:** npm run test  

### Implementation sequence

**Phase A: Domain & Types** (isolated, no dependencies)
1. Create rule-engine.errors.ts
2. Create rule.types.ts
3. Create rule.strategy.ts

**Phase B: Strategies** (domain logic)
4. Create range-threshold.strategy.ts
5. Create inverse-threshold.strategy.ts
6. Create count-threshold.strategy.ts
7. Create ordinal-manual.strategy.ts
8. Create role-conditional.strategy.ts
9. Create strategy.registry.ts

**Phase C: Engine & Validation** (orchestration)
10. Create rule-engine.ts
11. Create rule-config.validator.ts
12. Create rule-engine.module.ts

**Phase D: Tests** (verification)
13. Create test suite (~15-20 test files)
14. Run TypeScript strict + ESLint checks
15. Run full test suite
