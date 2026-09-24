import { describe, it, expect } from 'vitest';
import { AiScoringEngine } from './ai-evaluator.js';
import { MemberJiraMetrics } from './jira-client.js';

describe('Penalty-based Scoring & Date Range (TC01 - TC10)', () => {
  const engine = new AiScoringEngine('H2-2026', undefined);

  const baseMetrics: MemberJiraMetrics = {
    employeeCode: '163188',
    memberName: 'Lương Công Kỳ',
    team: 'ALLEGRO',
    filterUrl: 'http://jira.example.com',
    completedFilterUrl: 'http://jira.example.com/completed',
    inProgressFilterUrl: 'http://jira.example.com/inprogress',
    totalTasks: 25,
    completedTasks: 25,
    onTimeTasks: 25,
    onTimeRate: 100,
    delayedTasks: 0,
    inProgressTasks: 0,
    totalHoursSpent: 120,
    totalBugs: 0,
    resolvedBugs: 0,
    criticalBugs: 0,
    sampleTaskKeys: ['ALL-101', 'ALL-102'],
    inProgressTaskKeys: [],
    bugTaskKeys: [],
    tasks: [
      {
        key: 'ALL-101',
        summary: 'Core Refactor Engine',
        projectKey: 'ALL',
        projectName: 'ALLEGRO',
        issueType: 'Story',
        isBug: false,
        priority: 'High',
        status: 'Closed',
        isCompleted: true,
        isOnTime: true,
        createdDate: '2026-07-01',
        dueDate: '2026-07-15',
        resolutionDate: '2026-07-14',
        timeSpentHours: 8,
        jiraUrl: 'https://pim.cyberlogitec.com/jira/browse/ALL-101',
      },
    ],
  };

  it('TC07: Baseline 100 with zero infractions reaches perfect score 100 (Level 5)', () => {
    const penalty = engine.calculatePenaltyScore(baseMetrics, [
      {
        taskKey: 'ALL-101',
        summary: 'Core Refactor',
        issueType: 'Story',
        priority: 'High',
        status: 'Closed',
        isOnTime: true,
        timeSpentHours: 8,
        complexityScore: 5,
        complexityRationale: 'High complexity',
        contributionScore: 5,
        contributionRationale: 'Exceptional',
        aiComment: 'Good',
        jiraUrl: 'http://jira.example.com/browse/ALL-101',
      },
    ]);

    expect(penalty.baselineScore).toBe(100);
    expect(penalty.deductions.length).toBe(0);
    expect(penalty.finalScore).toBe(100);
  });

  it('TC08: Critical bugs deduct points correctly from 100', () => {
    const metricsWithBugs: MemberJiraMetrics = {
      ...baseMetrics,
      criticalBugs: 2,
      totalBugs: 2,
    };

    const penalty = engine.calculatePenaltyScore(metricsWithBugs, []);
    expect(penalty.deductions.some((d) => d.category === 'CODE_QUALITY')).toBe(true);
    expect(penalty.totalDeductions).toBeGreaterThanOrEqual(30);
    expect(penalty.finalScore).toBeLessThanOrEqual(75);
  });

  it('TC09: Delayed tasks deduct points for deadline infractions', () => {
    const metricsWithDelays: MemberJiraMetrics = {
      ...baseMetrics,
      delayedTasks: 3,
    };

    const penalty = engine.calculatePenaltyScore(metricsWithDelays, []);
    expect(penalty.deductions.some((d) => d.category === 'DEADLINE')).toBe(true);
    expect(penalty.totalDeductions).toBe(12); // 3 * 4
    expect(penalty.finalScore).toBe(93); // 100 - 12 + 5 (25 tasks bonus) = 93
  });

  it('TC10: Heavy infractions clamp score safely to minimum 0', () => {
    const heavyInfractions: MemberJiraMetrics = {
      ...baseMetrics,
      criticalBugs: 10,
      totalBugs: 20,
      delayedTasks: 20,
      completedTasks: 0,
    };

    const penalty = engine.calculatePenaltyScore(heavyInfractions, []);
    expect(penalty.finalScore).toBeGreaterThanOrEqual(0);
    expect(penalty.finalScore).toBeLessThanOrEqual(100);
  });

  it('TC11: Infraction Ceiling prevents bonuses from masking disciplinary infractions', () => {
    // 1 Critical bug (-15), but 25 completed tasks (+5) and 4 high-complexity tasks (+5)
    const metricsWithDisciplineBug: MemberJiraMetrics = {
      ...baseMetrics,
      criticalBugs: 1,
      totalBugs: 1,
      completedTasks: 25,
    };

    const highComplexityTasks = [
      { taskKey: 'T-1', summary: '', issueType: 'Task', priority: 'High', status: 'Done', isOnTime: true, timeSpentHours: 8, complexityScore: 5, complexityRationale: '', contributionScore: 5, contributionRationale: '', aiComment: '', jiraUrl: '' },
      { taskKey: 'T-2', summary: '', issueType: 'Task', priority: 'High', status: 'Done', isOnTime: true, timeSpentHours: 8, complexityScore: 4, complexityRationale: '', contributionScore: 5, contributionRationale: '', aiComment: '', jiraUrl: '' },
      { taskKey: 'T-3', summary: '', issueType: 'Task', priority: 'High', status: 'Done', isOnTime: true, timeSpentHours: 8, complexityScore: 4, complexityRationale: '', contributionScore: 4, contributionRationale: '', aiComment: '', jiraUrl: '' },
    ];

    const penalty = engine.calculatePenaltyScore(metricsWithDisciplineBug, highComplexityTasks, 'MEDIUM');
    // Raw: 100 - 15 + 5 (volume) + 5 (complexity) = 95
    // Ceiling: 100 - 15 = 85
    expect(penalty.totalDeductions).toBe(15);
    expect(penalty.totalBonuses).toBe(10);
    expect(penalty.finalScore).toBe(85); // Strictly capped by Infraction Ceiling
  });

  it('TC12: Strictness mode scales deductions, bonuses, and final scores (EASY > MEDIUM > HARD)', () => {
    const testMetrics: MemberJiraMetrics = {
      ...baseMetrics,
      delayedTasks: 2,
      completedTasks: 16,
    };

    const easyScore = engine.calculatePenaltyScore(testMetrics, [], 'EASY').finalScore;
    const medScore = engine.calculatePenaltyScore(testMetrics, [], 'MEDIUM').finalScore;
    const hardScore = engine.calculatePenaltyScore(testMetrics, [], 'HARD').finalScore;

    // EASY mode deductions are lighter and bonuses are higher
    // HARD mode deductions are heavy and bonuses are harder to get
    expect(easyScore).toBeGreaterThan(medScore);
    expect(medScore).toBeGreaterThan(hardScore);
  });

  it('TC13: detectEvaluationStrictness resolves presets correctly', () => {
    const hardEngine = new AiScoringEngine('H2-2026', undefined, undefined, undefined, undefined, 'Thẩm định chuyên sâu và nghiêm ngặt cấp Architect');
    expect(hardEngine.getStrictnessMode()).toBe('HARD');

    const easyEngine = new AiScoringEngine('H2-2026', undefined, undefined, undefined, undefined, 'Tóm tắt ngắn gọn và tiết kiệm token');
    expect(easyEngine.getStrictnessMode()).toBe('EASY');

    const defaultEngine = new AiScoringEngine('H2-2026', undefined, undefined, undefined, undefined, undefined);
    expect(defaultEngine.getStrictnessMode()).toBe('MEDIUM');
  });
});

