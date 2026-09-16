import { Pool } from 'pg';
import { describe, it, expect } from 'vitest';
import { CollectorService } from './collector.service.js';
import type { BlueprintTeamMemberAttendance, BlueprintTaskRecord } from '../domain/collector.types.js';

describe('Collector Monthly Snapshot Caching & Aggregation', () => {
  // Use a dummy pool for pure method testing
  const dummyPool = {} as unknown as Pool;
  const service = new CollectorService(dummyPool);

  describe('getMonthsBetween', () => {
    it('should return all months in a 6-month evaluation cycle (YYYY-MM-DD)', () => {
      const months = service.getMonthsBetween('2026-03-14', '2026-09-14');
      expect(months).toEqual([
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
      expect(months.length).toBe(7);
    });

    it('should return all months in a 1-year evaluation cycle (MM/DD/YYYY)', () => {
      const months = service.getMonthsBetween('09/14/2025', '09/14/2026');
      expect(months.length).toBe(13);
      expect(months[0]).toBe('2025-09');
      expect(months[months.length - 1]).toBe('2026-09');
    });

    it('should handle single month or undefined gracefully', () => {
      const months = service.getMonthsBetween('2026-09-01', '2026-09-30');
      expect(months).toEqual(['2026-09']);
    });
  });

  describe('normalizeToYearMonth', () => {
    it('should parse YYYY-MM-DD', () => {
      expect(service.normalizeToYearMonth('2026-03-15')).toBe('2026-03');
    });

    it('should parse MMM-DD-YYYY (Blueprint format)', () => {
      expect(service.normalizeToYearMonth('Sep-14-2026')).toBe('2026-09');
      expect(service.normalizeToYearMonth('Mar-01-2026')).toBe('2026-03');
    });

    it('should parse MM/DD/YYYY', () => {
      expect(service.normalizeToYearMonth('03/14/2026')).toBe('2026-03');
      expect(service.normalizeToYearMonth('12/01/2026')).toBe('2026-12');
    });

    it('should parse YYYYMMDD', () => {
      expect(service.normalizeToYearMonth('20260901')).toBe('2026-09');
    });
  });

  describe('aggregateTeamAttendanceRecords', () => {
    it('should accurately calculate punctuality metrics and score10 across multiple months', () => {
      const mockRecords: BlueprintTeamMemberAttendance[] = [
        {
          empeNo: 'E001',
          empeName: 'Nguyen Van A',
          orzNm: 'ALLEGRO NX Part',
          date: '2026-03-05',
          punchIn: '08:25',
          punchOut: '17:35',
          workShift: '08:30 - 17:30',
          status: 'ON_TIME',
          lateMinutes: 0,
        },
        {
          empeNo: 'E002',
          empeName: 'Tran Van B',
          orzNm: 'ALLEGRO NX Part',
          date: '2026-03-05',
          punchIn: '08:45',
          punchOut: '17:30',
          workShift: '08:30 - 17:30',
          status: 'LATE',
          lateMinutes: 15,
        },
        {
          empeNo: 'E003',
          empeName: 'Le Thi C',
          orzNm: 'ALLEGRO NX Part',
          date: '2026-03-05',
          punchIn: null,
          punchOut: null,
          workShift: '08:30 - 17:30',
          status: 'LEAVE',
          lateMinutes: 0,
          leaveType: 'Annual Leave',
        },
        {
          empeNo: 'E001',
          empeName: 'Nguyen Van A',
          orzNm: 'ALLEGRO NX Part',
          date: '2026-09-02',
          punchIn: '08:20',
          punchOut: '17:30',
          workShift: '08:30 - 17:30',
          status: 'ON_TIME',
          lateMinutes: 0,
        },
      ];

      const summary = service.aggregateTeamAttendanceRecords(mockRecords, 'ATM202310170003', '2026-03-01', '2026-09-14');

      expect(summary.totalMembers).toBe(4);
      expect(summary.attendedMembers).toBe(3);
      expect(summary.onTimeMembers).toBe(2);
      expect(summary.lateMembers).toBe(1);
      expect(summary.leaveMembers).toBe(1);
      // Countable = attended + late = 3 (since 2 on time, rate = 2/3 = 66.67%)
      expect(summary.punctualityRate).toBe(66.67);
      expect(summary.score10).toBe(3);
      expect(summary.grade).toBe('D');
    });

    it('should award 10 (S) when 100% on time', () => {
      const mockRecords: BlueprintTeamMemberAttendance[] = [
        {
          empeNo: 'E001',
          empeName: 'Nguyen Van A',
          orzNm: 'ALLEGRO NX Part',
          date: '2026-09-02',
          punchIn: '08:20',
          punchOut: '17:30',
          workShift: '08:30 - 17:30',
          status: 'ON_TIME',
          lateMinutes: 0,
        },
      ];

      const summary = service.aggregateTeamAttendanceRecords(mockRecords);
      expect(summary.punctualityRate).toBe(100);
      expect(summary.score10).toBe(10);
      expect(summary.grade).toBe('S');
    });
  });

  describe('aggregateTasks', () => {
    it('should accurately calculate on-time rate and score10 from tasks', () => {
      const mockTasks: BlueprintTaskRecord[] = [
        {
          id: 'REQ-101',
          title: 'Implement feature A',
          status: 'Finished',
          isOnTime: true,
          delayHours: 0,
          registeredDate: '2026-03-10',
          plannedDue: '2026-03-20',
          actualFinish: '2026-03-19',
        },
        {
          id: 'REQ-102',
          title: 'Fix bug B',
          status: 'Finished',
          isOnTime: true,
          delayHours: 0,
          registeredDate: '2026-04-05',
          plannedDue: '2026-04-12',
          actualFinish: '2026-04-11',
        },
        {
          id: 'REQ-103',
          title: 'Refactor module C',
          status: 'Closed',
          isOnTime: false,
          delayHours: 24,
          registeredDate: '2026-08-01',
          plannedDue: '2026-08-10',
          actualFinish: '2026-08-12',
        },
      ];

      const summary = service.aggregateTasks(mockTasks, 'Allegro NX', 'kyluong');

      expect(summary.totalTasks).toBe(3);
      expect(summary.completedTasks).toBe(3);
      expect(summary.onTimeTasks).toBe(2);
      expect(summary.delayedTasks).toBe(1);
      // 2 / 3 = 66.67%
      expect(summary.onTimeRate).toBe(66.67);
      expect(summary.score10).toBe(3);
      expect(summary.grade).toBe('D');
      expect(summary.delayedTaskList?.length).toBe(1);
      expect(summary.delayedTaskList?.[0]?.id).toBe('REQ-103');
    });

    it('should award 9 (A) when on-time rate >= 90%', () => {
      const mockTasks: BlueprintTaskRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: `REQ-${i}`,
        title: `Task ${i}`,
        status: 'Finished',
        isOnTime: i !== 0, // 9 out of 10 on time = 90%
        delayHours: i === 0 ? 24 : 0,
      }));

      const summary = service.aggregateTasks(mockTasks);
      expect(summary.onTimeRate).toBe(90);
      expect(summary.score10).toBe(9);
      expect(summary.grade).toBe('A');
    });
  });
});
