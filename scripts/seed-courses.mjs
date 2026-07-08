import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const dataPath = resolve(process.cwd(), 'data/hkust-courses.json');
const courses = JSON.parse(readFileSync(dataPath, 'utf8'));

const BATCH_SIZE = 500;

async function seedCourses() {
  console.log(`Seeding ${courses.length} courses from ${dataPath}...`);

  let inserted = 0;
  for (let i = 0; i < courses.length; i += BATCH_SIZE) {
    const batch = courses.slice(i, i + BATCH_SIZE);
    const { error } = await admin.from('courses').upsert(batch, {
      onConflict: 'course_code,course_title',
      ignoreDuplicates: false,
    });

    if (error) {
      if (error.message.includes('relation "public.courses" does not exist')) {
        console.error(
          'courses table not found. Run docs/migrations/019_courses_catalog.sql in Supabase SQL Editor first.'
        );
        process.exit(1);
      }
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Upserted ${inserted}/${courses.length}`);
  }

  const { count, error: countError } = await admin
    .from('courses')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.warn('Seed completed but count check failed:', countError.message);
  } else {
    console.log(`Done. courses table now has ${count} rows.`);
  }
}

seedCourses().catch((error) => {
  console.error(error);
  process.exit(1);
});
