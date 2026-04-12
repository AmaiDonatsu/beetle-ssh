// conf is ESM so we import it dynamically in CommonJS
let confInstance = null;

async function getConf() {
  if (!confInstance) {
    const { default: Conf } = await import('conf');
    confInstance = new Conf({
      projectName: 'beetle-ssh',
      defaults: {
        sshs: []
      }
    });
  }
  return confInstance;
}

/**
 * Adds public SSH metadata to the configuration.
 * @param {object} config { id, route, alias }
 */
async function addSshConfig({ id, route, alias }) {
  const conf = await getConf();
  const sshs = conf.get('sshs');
  
  if (sshs.find(s => s.id === id)) {
    throw new Error(`SSH Config with ID ${id} already exists`);
  }
  
  sshs.push({ id, route, alias });
  conf.set('sshs', sshs);
}

/**
 * Gets the SSH metadata for a given ID.
 * @param {string|number} id 
 * @returns {Promise<object|undefined>}
 */
async function getSshConfig(id) {
  const conf = await getConf();
  const sshs = conf.get('sshs');
  return sshs.find(s => s.id === id);
}

/**
 * Gets all SSH metadata configurations.
 * @returns {Promise<Array>}
 */
async function listSshConfigs() {
  const conf = await getConf();
  return conf.get('sshs');
}

/**
 * Removes an SSH configuration by ID.
 * @param {string|number} id 
 */
async function removeSshConfig(id) {
  const conf = await getConf();
  let sshs = conf.get('sshs');
  const initialLength = sshs.length;
  // Type coercion safely:
  sshs = sshs.filter(s => String(s.id) !== String(id));
  if (sshs.length === initialLength) {
    throw new Error(`SSH Config with ID ${id} not found`);
  }
  conf.set('sshs', sshs);
}

module.exports = {
  addSshConfig,
  getSshConfig,
  listSshConfigs,
  removeSshConfig,
  getConf // Exposed for clearing/debugging if needed
};
