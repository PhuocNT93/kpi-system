# Step 5: Define Test Cases

Status: reconstructed from an earlier approved response

## Deliverable

### Test Cases

| ID | Scenario | Preconditions | Action | Expected Result |
|---|---|---|---|---|
| TC01 | List renders all cards | `EvaluationPickerList` with 3 items | Render | 3 buttons, each with title, subtitle and status badge |
| TC02 | Selected card | `activeId` = item 2 | Render | Only item 2 has `aria-pressed="true"` |
| TC03 | Select a card | `onSelect` mock | Click item 3 | `onSelect` called once with item 3 id |
| TC04 | Search input | `onSearchChange` mock | Type "hà" | `onSearchChange` receives "hà" |
| TC05 | Empty state | `items = []` | Render | `emptyLabel` shown, no card buttons |
| TC06 | List scrollbar hidden | Render | Query the list region | Region has class `no-scrollbar` |
| TC07 | Hub tabs regression | Existing test | `npm --prefix frontend test` | `UnifiedEvaluationsHubPage.test.tsx` passes |
| TC08 | Sidebar regression | Existing layout tests | `npm --prefix frontend test` | `shared/layout` tests pass |
| TC09 | Typecheck / lint / build | — | `typecheck`, `lint`, `build` | No errors, no `any`, no unused imports |
| TC10 | Desktop layout (manual) | ≥1280px, HR user | Open `?tab=my` | Left list; right: profile → Overall + score → level cards → PDP → Criteria |
| TC11 | Switch evaluation (manual) | HR, ≥2 employees | Click another card | Right column shows that employee's name, code, score, PDP |
| TC12 | EMPLOYEE (manual) | EMPLOYEE with 1 evaluation | Open tab my | 1 card on the left; real name (no "Alex Nguyen"); Submit behaves as before |
| TC13 | No vertical scrollbar (manual) | Long menu and list | Inspect Sidebar and list | No vertical scrollbar visible; wheel/keyboard scrolling works |
| TC14 | Responsive (manual) | <1024px | Resize | Single column, no horizontal scrollbar, donuts shrink |
| TC15 | Missing profile data (manual) | No join date / manager | Open page | Missing facts show `N/A` |

## Next Step

Step 6 - Implement.
