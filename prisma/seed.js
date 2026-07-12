const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: 'Sustainability & ESG', code: 'ESG', head: 'alice@ecosphere.com', parentId: null, status: 'Active' },
  { name: 'Operations & Logistics', code: 'OPS', head: 'bob@ecosphere.com', parentId: null, status: 'Active' },
  { name: 'Research & Development', code: 'RD', head: 'diana@ecosphere.com', parentId: null, status: 'Active' },
  { name: 'Human Resources', code: 'HR', head: 'frank@ecosphere.com', parentId: null, status: 'Active' },
  { name: 'Sales & Marketing', code: 'MKT', head: 'bruce@ecosphere.com', parentId: null, status: 'Active' }
];

const EMISSION_FACTORS = [
  // Purchase
  { name: 'Grid Electricity', category: 'Purchase', unit: 'kWh', factorValue: 0.42, description: 'Average grid mix carbon intensity', status: 'Active' },
  { name: 'Natural Gas Heating', category: 'Purchase', unit: 'm3', factorValue: 2.03, description: 'Natural gas combustion emissions', status: 'Active' },
  // Manufacturing
  { name: 'Steel Sourcing', category: 'Manufacturing', unit: 'kg', factorValue: 1.85, description: 'Primary steel production emission factor', status: 'Active' },
  { name: 'PET Plastic Granules', category: 'Manufacturing', unit: 'kg', factorValue: 3.10, description: 'Virgin PET plastic material', status: 'Active' },
  // Expense
  { name: 'Short-haul Business Flight', category: 'Expense', unit: 'passenger-km', factorValue: 0.15, description: 'Business flight carbon impact per km', status: 'Active' },
  { name: 'Long-haul Business Flight', category: 'Expense', unit: 'passenger-km', factorValue: 0.11, description: 'Long-haul business flight per km', status: 'Active' },
  // Fleet
  { name: 'Fleet Diesel Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.68, description: 'Diesel commercial vehicle fuel consumption', status: 'Active' },
  { name: 'Fleet Petrol Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.31, description: 'Standard unleaded commercial fuel', status: 'Active' }
];

const BADGES = [
  { name: 'Eco Warrior', description: 'Earn over 1,000 XP in sustainability initiatives.', ruleType: 'xp_threshold', ruleValue: 1000, icon: 'ShieldAlert', xpBonus: 200 },
  { name: 'Consistent Green', description: 'Maintain a 5-day interaction streak on the platform.', ruleType: 'streak_days', ruleValue: 5, icon: 'Zap', xpBonus: 150 },
  { name: 'Challenge Champion', description: 'Complete 3 ESG challenges successfully.', ruleType: 'challenges_completed', ruleValue: 3, icon: 'Award', xpBonus: 300 }
];

const REWARDS = [
  { name: 'Recycled Bamboo Coffee Mug', description: 'EcoSphere branded travel mug made from 100% recycled bamboo fiber.', pointsRequired: 150, stock: 25, status: 'Active' },
  { name: 'Organic Cotton Tote Bag', description: 'Heavy-duty organic canvas tote bag with reinforced handles.', pointsRequired: 100, stock: 40, status: 'Active' },
  { name: 'Sapling Planting Dedication', description: 'A sapling planted in your name in our reforestation zone.', pointsRequired: 300, stock: 100, status: 'Active' },
  { name: 'Extra Work From Home Day', description: 'Voucher for one additional remote work day.', pointsRequired: 500, stock: 5, status: 'Active' }
];

async function main() {
  console.log('Seeding database...');

  // 1. Seed Config Singleton
  await prisma.eSGConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      orgName: 'EcoSphere Corp',
      envWeight: 0.4,
      socialWeight: 0.3,
      govWeight: 0.3
    }
  });
  console.log('Config seeded.');

  // 2. Seed Departments
  const deptMap = {};
  for (const dept of DEPARTMENTS) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept
    });
    deptMap[dept.code] = d.id;
  }
  console.log('Departments seeded.');

  // 3. Seed Emission Factors
  for (const factor of EMISSION_FACTORS) {
    await prisma.emissionFactor.create({
      data: factor
    });
  }
  console.log('Emission Factors seeded.');

  // 4. Seed Badges
  for (const badge of BADGES) {
    await prisma.badge.create({
      data: badge
    });
  }
  console.log('Badges seeded.');

  // 5. Seed Rewards
  for (const reward of REWARDS) {
    await prisma.reward.create({
      data: reward
    });
  }
  console.log('Rewards seeded.');

  // 6. Seed Employees
  const EMPLOYEES = [
    { email: 'alice@ecosphere.com', name: 'Alice Smith', role: 'Admin', departmentId: deptMap['ESG'], xp: 2500, totalPoints: 1800, streakDays: 12, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { email: 'bob@ecosphere.com', name: 'Bob Jones', role: 'DepartmentHead', departmentId: deptMap['OPS'], xp: 1400, totalPoints: 950, streakDays: 5, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { email: 'charlie@ecosphere.com', name: 'Charlie Brown', role: 'Employee', departmentId: deptMap['RD'], xp: 450, totalPoints: 300, streakDays: 3, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
  ];

  for (const emp of EMPLOYEES) {
    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: emp
    });
  }
  console.log('Employees seeded.');

  // 7. Seed sample environmental Goals
  const esgDeptId = deptMap['ESG'];
  const opsDeptId = deptMap['OPS'];
  const rdDeptId = deptMap['RD'];

  await prisma.goal.createMany({
    data: [
      { name: 'Reduce Carbon Footprint', description: 'Reduce total scope 1 & 2 carbon emissions', targetValue: 10000, currentValue: 6420, unit: 'kg CO2e', deadline: new Date('2026-12-31'), departmentId: esgDeptId, status: 'Active' },
      { name: 'Green Fleet Transition', description: 'Reduce diesel fleet fuel usage by transitioning to hybrid/electric vehicles', targetValue: 5000, currentValue: 2100, unit: 'liters', deadline: new Date('2026-09-30'), departmentId: opsDeptId, status: 'Active' },
      { name: 'Eco-Material Integration', description: 'Ensure R&D uses sustainable polymers and metals', targetValue: 80, currentValue: 55, unit: '% materials', deadline: new Date('2026-11-15'), departmentId: rdDeptId, status: 'Active' }
    ]
  });
  console.log('Goals seeded.');

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
