const { addSshConfig, getSshConfig, listSshConfigs, getConf } = require('./src/config-store');
const { setEnv, getEnv, deleteEnv } = require('./src/secret-store');

async function run() {
  try {
    const id = 1;
    const route = 'root@192.168.1.100';
    const envObj = { SUPER_USER_PASSWORD: 'password123' };

    console.log('1. Clearing old state...');
    const conf = await getConf();
    conf.clear();
    await deleteEnv(id);

    console.log('2. Storing public metadata...');
    await addSshConfig({ id, route, alias: 'prod-db' });

    console.log('3. Storing sensitive env...');
    await setEnv(id, envObj);

    console.log('4. Fetching back metadata...');
    const allConfigs = await listSshConfigs();
    console.log('All configs:', allConfigs);

    console.log('5. Fetching back sensitive env...');
    const fetchedEnv = await getEnv(id);
    console.log('Fetched Env (should be password123):', fetchedEnv);

    console.log('6. Combining them...');
    const finalData = {
      sshs: allConfigs.map(c => ({
        ...c,
        env: c.id === id ? fetchedEnv : null
      }))
    };
    
    console.log(JSON.stringify(finalData, null, 2));

    console.log('Done.');
  } catch (err) {
    console.error('Error in test:', err);
  }
}

run();
