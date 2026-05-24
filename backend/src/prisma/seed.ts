import { PrismaClient, Role, Priority, TicketCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Departments
  const departments = await Promise.all([
    prisma.department.upsert({ where: { name: 'IT' }, update: {}, create: { name: 'IT' } }),
    prisma.department.upsert({ where: { name: 'HR' }, update: {}, create: { name: 'HR' } }),
    prisma.department.upsert({ where: { name: 'Finance' }, update: {}, create: { name: 'Finance' } }),
    prisma.department.upsert({ where: { name: 'Operations' }, update: {}, create: { name: 'Operations' } }),
    prisma.department.upsert({ where: { name: 'Sales' }, update: {}, create: { name: 'Sales' } }),
  ]);

  // SLA Config
  await Promise.all([
    prisma.sLAConfig.upsert({ where: { priority: Priority.LOW }, update: {}, create: { priority: Priority.LOW, responseTime: 480, resolutionTime: 2880 } }),
    prisma.sLAConfig.upsert({ where: { priority: Priority.MEDIUM }, update: {}, create: { priority: Priority.MEDIUM, responseTime: 240, resolutionTime: 1440 } }),
    prisma.sLAConfig.upsert({ where: { priority: Priority.HIGH }, update: {}, create: { priority: Priority.HIGH, responseTime: 60, resolutionTime: 480 } }),
    prisma.sLAConfig.upsert({ where: { priority: Priority.CRITICAL }, update: {}, create: { priority: Priority.CRITICAL, responseTime: 15, resolutionTime: 120 } }),
  ]);

  // Super Admin
  const hashedPass = await bcrypt.hash('Admin@123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@company.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@company.com',
      password: hashedPass,
      role: Role.SUPER_ADMIN,
      departmentId: departments[0].id,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'IT Admin',
      email: 'admin@company.com',
      password: hashedPass,
      role: Role.ADMIN,
      departmentId: departments[0].id,
      isActive: true,
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@company.com' },
    update: {},
    create: {
      name: 'John Engineer',
      email: 'engineer@company.com',
      password: hashedPass,
      role: Role.ENGINEER,
      departmentId: departments[0].id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@company.com' },
    update: {},
    create: {
      name: 'Jane Employee',
      email: 'user@company.com',
      password: hashedPass,
      role: Role.USER,
      departmentId: departments[1].id,
      isActive: true,
    },
  });

  // Quick reply templates
  const templates = [
    { title: 'Acknowledging ticket', content: 'Thank you for contacting IT Support. We have received your ticket and will get back to you shortly.', createdBy: engineer.id },
    { title: 'Requesting more info', content: 'Could you please provide more details about the issue? Specifically, when did this start and have you tried restarting your device?', createdBy: engineer.id },
    { title: 'Resolution follow-up', content: 'We believe the issue has been resolved. Could you please confirm if everything is working as expected?', createdBy: engineer.id },
    { title: 'Ticket escalated', content: 'Your ticket has been escalated to a senior engineer for further investigation. We will keep you updated.', createdBy: engineer.id },
  ];

  for (const t of templates) {
    await prisma.quickReplyTemplate.create({ data: t }).catch(() => {});
  }

  // Knowledge base articles
  const articles = [
    { title: 'How to reset your Windows password', content: '## Windows Password Reset\n\n1. Press Ctrl+Alt+Delete\n2. Click "Change a password"\n3. Enter current password\n4. Enter new password\n5. Confirm new password\n6. Click the arrow button\n\n> If you are locked out, contact IT Support with your employee ID.', category: TicketCategory.PASSWORD_RESET, tags: ['password', 'windows', 'login'], createdById: admin.id },
    { title: 'Connecting to Company VPN', content: '## VPN Connection Guide\n\n1. Open the VPN client (Cisco AnyConnect or similar)\n2. Enter server: vpn.company.com\n3. Use your company email and password\n4. Complete the 2FA if prompted\n\n### Troubleshooting\n- Ensure you have internet connectivity\n- Disable other VPN software\n- Restart the VPN client', category: TicketCategory.VPN, tags: ['vpn', 'network', 'remote'], createdById: admin.id },
    { title: 'Fix slow laptop performance', content: '## Laptop Performance Issues\n\n### Quick Fixes\n1. Restart your laptop\n2. Close unused applications (Ctrl+Shift+Esc → Task Manager)\n3. Clear temporary files (Win+R → %temp% → Delete all)\n4. Disable startup programs\n5. Run Windows Update\n\n### If Issue Persists\nRaise an IT ticket with your device name and serial number.', category: TicketCategory.PERFORMANCE, tags: ['laptop', 'slow', 'performance'], createdById: admin.id },
    { title: 'Printer not working - Troubleshooting', content: '## Printer Troubleshooting\n\n1. Check if printer is ON and connected\n2. Verify network connection (for network printers)\n3. Clear print queue: Services → Print Spooler → Restart\n4. Reinstall printer drivers\n5. Check paper and ink/toner levels\n\n### Network Printer\n- IP: Check the label on the printer\n- Add Printer → The printer I want is not listed → Add by IP', category: TicketCategory.PRINTER, tags: ['printer', 'hardware', 'driver'], createdById: admin.id },
  ];

  for (const a of articles) {
    await prisma.knowledgeBase.create({ data: a }).catch(() => {});
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Super Admin: superadmin@company.com / Admin@123');
  console.log('  Admin:       admin@company.com / Admin@123');
  console.log('  Engineer:    engineer@company.com / Admin@123');
  console.log('  User:        user@company.com / Admin@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
