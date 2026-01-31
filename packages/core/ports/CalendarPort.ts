export interface CalendarSlot {
  start: string;  // ISO
  end: string;
}

export interface CreateEventInput {
  start: string;
  end: string;
  title: string;
  participantIds: string[];
}

export interface CalendarPort {
  getBusySlots(userId: string, from: string, to: string): Promise<CalendarSlot[]>;
  createEvent(userId: string, input: CreateEventInput): Promise<void>;
}
