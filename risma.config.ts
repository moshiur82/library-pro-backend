// prisma.config.ts (backend-node রুটে রাখো)

import 'dotenv/config';  // .env লোড করা নিশ্চিত করো

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',  // schema.prisma-এর পাথ (যদি prisma ফোল্ডারে থাকে, তাহলে ঠিক আছে)
  datasource: {
    url: process.env.DATABASE_URL!,  // ! দিয়ে TypeScript-কে বলো এটা undefined হবে না
  },
  // migrations: {  // যদি migrate dev ব্যবহার করো, এটা যোগ করো (ঐচ্ছিক এখন)
  //   path: 'prisma/migrations',
  // },
});