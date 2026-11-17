import { createClient,DatabaseToolError,assertSeedEnvironment } from './lib/database.mjs';
import { seedBoardingAdvertisements } from './lib/boarding-seeds.mjs';
let client;
try{
 if(process.argv.length!==2)throw new DatabaseToolError('Usage: pnpm db:seed:boardings');
 assertSeedEnvironment(process.env.DATABASE_URL,process.env);
 client=createClient(process.env.DATABASE_URL);await client.connect();
 console.log(`boarding demo: ${await seedBoardingAdvertisements(client,process.env.DATABASE_URL,process.env)} synthetic previews verified; no real inventory`);
}catch(error){console.error(error instanceof DatabaseToolError?error.message:'Boarding demo seed failed; connection details redacted');process.exitCode=1;}
finally{await client?.end();}
