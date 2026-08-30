import { describe, expect, it } from 'vitest';
import { resolveSchedule } from '../src/domain/scheduleOverrides';
import type { Program, ScheduleOverride } from '../src/domain/types';

const program: Program = {id:'p',name:'ABC',userId:'u',createdAt:'x',updatedAt:'x',scheduleType:'cycle',cycleAnchorDate:'2026-08-27',fixedDays:[],cycleItems:[{id:'a',order:0,workoutId:'A'},{id:'b',order:1,workoutId:'B'},{id:'c',order:2,workoutId:'C'},{id:'r',order:3,workoutId:null}],missedPolicy:'keep-calendar',cycleOffset:0,paused:false,active:true};
const row=(date:string,workout:string|null,type:'replace'|'swap'|'rest'='replace'):ScheduleOverride=>({id:date,userId:'u',programId:'p',date,type,originalWorkoutId:null,overrideWorkoutId:workout,createdAt:'x',updatedAt:'x'});
describe('schedule overrides',()=>{
  it('extra execution does not change the base schedule',()=>expect(resolveSchedule(program,'2026-08-31',[]).effectiveWorkoutId).toBe('A'));
  it('replaces only one date',()=>{expect(resolveSchedule(program,'2026-08-31',[row('2026-08-31','B')]).effectiveWorkoutId).toBe('B');expect(resolveSchedule(program,'2026-09-01',[row('2026-08-31','B')]).effectiveWorkoutId).toBe('B');});
  it('represents a rest/workout swap with paired rows',()=>{const rows=[row('2026-08-30','A','swap'),row('2026-08-31',null,'swap')];expect(resolveSchedule(program,'2026-08-30',rows).effectiveWorkoutId).toBe('A');expect(resolveSchedule(program,'2026-08-31',rows).isRest).toBe(true);});
});
