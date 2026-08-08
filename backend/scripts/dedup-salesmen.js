/**
 * dedup-salesmen.js
 * 
 * Merges duplicate salesman users created during ERP import.
 * 
 * Problem: "JIGNESH" (id=11, no phone) and "JIGNESH (7567034004)" (id=39)
 * are the same person — the ERP sends different salesman field formats.
 *
 * Strategy:
 * 1. Find all salesmen whose salesman_code contains a phone number in brackets.
 * 2. For each, check if there's a "bare name" duplicate without phone.
 * 3. If yes: migrate all customers referencing the bare user → phone user.
 *            Then normalise the phone user's name/code to the bare form.
 *            Then delete the bare user.
 * 4. Update all remaining salesman_code values to clean names (no phones).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({
    where: { role: 'SALESMAN' },
    orderBy: { id: 'asc' },
  });

  // Split into "bare" and "with phone" users
  const phoneRegex = /^(.*?)\s*\((\d{9,11})\)$/;
  
  const usersWithPhone = allUsers.filter(u => phoneRegex.test(u.salesman_code || u.name));
  const usersWithoutPhone = allUsers.filter(u => !phoneRegex.test(u.salesman_code || u.name));

  console.log(`Total salesmen: ${allUsers.length}`);
  console.log(`With phone: ${usersWithPhone.length}`);
  console.log(`Without phone (bare): ${usersWithoutPhone.length}`);

  let mergedCount = 0;
  let normalizedCount = 0;

  for (const phoneUser of usersWithPhone) {
    const match = (phoneUser.salesman_code || phoneUser.name).match(phoneRegex);
    if (!match) continue;
    
    const cleanName = match[1].trim();
    const phone = match[2];

    // Find matching bare user by name
    const bareUser = usersWithoutPhone.find(u =>
      (u.salesman_code || '').toUpperCase() === cleanName.toUpperCase() ||
      (u.name || '').toUpperCase() === cleanName.toUpperCase()
    );

    if (bareUser) {
      console.log(`\nMerging: "${bareUser.name}" (id=${bareUser.id}) → "${phoneUser.name}" (id=${phoneUser.id})`);

      // Migrate customers from bareUser to phoneUser
      const updatedCustomers = await prisma.customer.updateMany({
        where: { salesman_code: bareUser.salesman_code },
        data: { salesman_code: cleanName }
      });
      console.log(`  Updated ${updatedCustomers.count} customers from bare user`);

      // Delete the bare user
      await prisma.user.delete({ where: { id: bareUser.id } });
      console.log(`  Deleted bare user id=${bareUser.id}`);
      mergedCount++;
    }

    // Normalize the phone user: clean name/code
    const phoneUserUsername = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if the clean username is already taken (by another user)
    const conflictUser = await prisma.user.findFirst({
      where: { username: phoneUserUsername, id: { not: phoneUser.id } }
    });

    await prisma.user.update({
      where: { id: phoneUser.id },
      data: {
        name: cleanName,
        salesman_code: cleanName,
        username: conflictUser ? phoneUser.username : phoneUserUsername,
        mobile: phone,
      }
    });

    // Also update customers referencing the old (with-phone) salesman_code
    await prisma.customer.updateMany({
      where: { salesman_code: phoneUser.salesman_code },
      data: { salesman_code: cleanName }
    });

    console.log(`  Normalized phoneUser id=${phoneUser.id}: name="${cleanName}", mobile=${phone}`);
    normalizedCount++;
  }

  console.log(`\n✅ Done! Merged ${mergedCount} duplicates, normalized ${normalizedCount} phone users.`);

  // Final user count
  const remaining = await prisma.user.findMany({ where: { role: 'SALESMAN' } });
  console.log(`Remaining salesman users: ${remaining.length}`);
  remaining.forEach(u => console.log(`  id=${u.id} | ${u.name} | mobile=${u.mobile} | code=${u.salesman_code}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
