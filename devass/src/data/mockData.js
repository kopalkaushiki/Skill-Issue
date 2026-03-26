export const dashboardFeed = [
  {
    id: 'feed-1',
    project: 'Realtime Pair Studio',
    update: 'Live code replay shipped. Looking for one backend reviewer for websocket scaling.',
    time: '2h ago',
    tags: ['React', 'Node.js', 'WebSocket'],
  },
  {
    id: 'feed-2',
    project: 'HackSprint Mentor Hub',
    update: 'Mentor matching algorithm improved with weighted skill overlap and timezone scoring.',
    time: '5h ago',
    tags: ['Python', 'FastAPI', 'PostgreSQL'],
  },
  {
    id: 'feed-3',
    project: 'DevAssemble Mobile',
    update: 'Navigation polish sprint starts tonight. Need Flutter contributor for animation pass.',
    time: '1d ago',
    tags: ['Flutter', 'UI', 'Animation'],
  },
];

export const collaborationAppeals = [
  {
    id: 'appeal-1',
    title: 'Need help now: auth edge-case triage',
    detail: 'Email verification edge cases in production. 4 bugs left. Join for a 90-min sprint.',
    urgency: 'High',
    deadline: 'Today, 8:30 PM',
  },
  {
    id: 'appeal-2',
    title: 'Hackathon API review',
    detail: 'Looking for a second pair of eyes on API schema before launch weekend.',
    urgency: 'Medium',
    deadline: 'Tomorrow, 11:00 AM',
  },
];

export const recommendedDevelopers = [
  {
    id: 'dev-1',
    name: 'Mina Park',
    role: 'Frontend Developer',
    match: 96,
    status: 'Open to collaborate',
    skills: ['React', 'TypeScript', 'Motion UI'],
  },
  {
    id: 'dev-2',
    name: 'Arjun Nair',
    role: 'Fullstack Developer',
    match: 92,
    status: 'Available now',
    skills: ['Node.js', 'PostgreSQL', 'GraphQL'],
  },
  {
    id: 'dev-3',
    name: 'Camila Soto',
    role: 'ML/AI Engineer',
    match: 88,
    status: 'Available part-time',
    skills: ['Python', 'FastAPI', 'TensorFlow'],
  },
  {
    id: 'dev-4',
    name: 'Noah Kim',
    role: 'DevOps Engineer',
    match: 84,
    status: 'Busy',
    skills: ['Docker', 'AWS', 'Terraform'],
  },
];

export const userProfile = {
  name: 'Kopal Kaushiki',
  role: 'Fullstack Developer',
  headline: 'Building clean developer collaboration products with fast feedback loops.',
  availability: 'Open to collaborate',
  location: 'Remote · US/India overlap',
  techStack: ['MERN', 'React', 'Node.js', 'Supabase', 'FastAPI'],
  skills: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'UI Systems', 'API Design'],
  pastProjects: [
    {
      id: 'past-1',
      name: 'CodeReview Pulse',
      summary: 'Asynchronous review assistant for student teams.',
      impact: 'Cut review turnaround by 32%',
    },
    {
      id: 'past-2',
      name: 'SprintSync',
      summary: 'Team planning board with milestone heatmap.',
      impact: 'Used by 14 active teams',
    },
  ],
  activeProjects: [
    {
      id: 'active-1',
      name: 'DevAssemble Core',
      role: 'Product + frontend',
      stage: 'MVP polish',
    },
    {
      id: 'active-2',
      name: 'FlowBoard Mobile',
      role: 'UI architecture',
      stage: 'Prototype',
    },
  ],
};

// NOTE: Projects are now persisted in Supabase (see `devass/supabase-schema.sql`)
// `projectDetail` used to be hard-coded; keep mock data here limited to dashboard-only demo content.
