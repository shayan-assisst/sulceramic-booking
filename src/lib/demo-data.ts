// Mock data for demo / GitHub Pages mode.
// All write actions are no-ops and surface a toast in the UI.

export const demoUser = {
  id: "demo-user",
  name: "Maria Sant'Anna",
  email: "demo@sulceramic.com",
  image: null as string | null,
  role: "USER" as const,
};

const today = new Date();
function daysFromNow(n: number, hour = 18, minute = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const demoBookings = [
  {
    id: "demo-bk-1",
    type: "FIRST_SESSION" as const,
    status: "CONFIRMED" as const,
    startTime: daysFromNow(3, 17, 0),
    endTime: daysFromNow(3, 19, 0),
    notes: "First time! A little nervous, excited.",
    amountPaid: 5000,
    createdAt: daysFromNow(-2),
  },
  {
    id: "demo-bk-2",
    type: "RESIDENCY" as const,
    status: "CONFIRMED" as const,
    startTime: daysFromNow(5, 18, 0),
    endTime: daysFromNow(5, 20, 0),
    notes: null,
    amountPaid: 16000,
    createdAt: daysFromNow(-10),
    residency: {
      weeklyDayOfWeek: 3, // Wednesday
      weeklyTime: "18:00",
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      sessions: [
        {
          date: daysFromNow(5, 18, 0),
          startTime: daysFromNow(5, 18, 0),
          endTime: daysFromNow(5, 20, 0),
          cancelled: false,
          rescheduled: null,
        },
        {
          date: daysFromNow(12, 18, 0),
          startTime: daysFromNow(12, 18, 0),
          endTime: daysFromNow(12, 20, 0),
          cancelled: false,
          rescheduled: null,
        },
        {
          date: daysFromNow(19, 18, 0),
          startTime: daysFromNow(19, 18, 0),
          endTime: daysFromNow(19, 20, 0),
          cancelled: false,
          rescheduled: null,
        },
        {
          date: daysFromNow(26, 18, 0),
          startTime: daysFromNow(26, 18, 0),
          endTime: daysFromNow(26, 20, 0),
          cancelled: false,
          rescheduled: null,
        },
      ],
    },
  },
];

export const demoMessages = [
  {
    id: "m1",
    senderId: "demo-user",
    recipientId: null,
    content: "Hi Miguel! Excited for my first session. Should I bring anything?",
    read: true,
    createdAt: daysFromNow(-2, 10, 0),
  },
  {
    id: "m2",
    senderId: "owner",
    recipientId: "demo-user",
    content: "Hi Maria! Just yourself and clothes that can get a bit dirty. Aprons are at the studio.",
    read: true,
    createdAt: daysFromNow(-2, 11, 30),
  },
  {
    id: "m3",
    senderId: "demo-user",
    recipientId: null,
    content: "Perfect, see you Wednesday!",
    read: false,
    createdAt: daysFromNow(-1, 9, 15),
  },
];

export const demoAvailability = [
  {
    id: "av-1",
    isRecurring: true,
    recurringPattern: { daysOfWeek: [1, 3, 5], startTime: "10:00", endTime: "20:00" },
    exceptions: [],
  },
  {
    id: "av-2",
    isRecurring: true,
    recurringPattern: { daysOfWeek: [6], startTime: "10:00", endTime: "16:00" },
    exceptions: [],
  },
];

export const demoOwnerView = {
  upcomingToday: [
    {
      id: "demo-bk-2",
      userName: "Maria Sant'Anna",
      type: "RESIDENCY" as const,
      startTime: daysFromNow(0, 18, 0),
      endTime: daysFromNow(0, 20, 0),
    },
  ],
  pendingMessages: 3,
  thisWeekSessions: 7,
};

export const demoUsersList = [
  { id: "demo-user", name: "Maria Sant'Anna", email: "maria@example.com", unread: 1 },
  { id: "demo-user-2", name: "Luís Pereira", email: "luis@example.com", unread: 0 },
  { id: "demo-user-3", name: "Anna Beecroft", email: "anna@example.com", unread: 2 },
];
