// Mock/sample dashboard data removed.

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
