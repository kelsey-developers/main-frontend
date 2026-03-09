import type { CleaningTask } from '../types';

/** Mock cleaning tasks for today - in a real app this would come from API filtered by date and assignee */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const mockCleaningTasksToday: CleaningTask[] = [
  { id: '1', unit: 'Unit 711', unitType: 'Condo', location: 'Davao City', date: today(), taskType: 'turnover', dueBy: '14:00', done: false, bookingId: 'BK-1024' },
  { id: '2', unit: 'Unit 712', unitType: 'Condo', location: 'Manila', date: today(), taskType: 'turnover', dueBy: '15:00', done: false, bookingId: 'BK-1023' },
  { id: '3', unit: 'A-1 Davao', unitType: 'Apartment', location: 'Matina', date: today(), taskType: 'inspection', dueBy: '11:00', done: false },
  { id: '4', unit: 'Unit 305', unitType: 'Condo', location: 'Davao City', date: today(), taskType: 'turnover', dueBy: '16:00', done: false, bookingId: 'BK-1025' },
  { id: '5', unit: 'B-2 Matina', unitType: 'Apartment', location: 'Matina', date: today(), taskType: 'restock', dueBy: '12:00', done: false },
];
