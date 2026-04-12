const keytar = require('keytar');

const SERVICE_NAME = 'beetle-ssh-env';

/**
 * Stores the environment variables securely for a given SSH configuration ID.
 * @param {string|number} id The ID of the SSH configuration.
 * @param {object} envObj The environment object to encrypt and store.
 */
async function setEnv(id, envObj) {
  const stringified = JSON.stringify(envObj);
  await keytar.setPassword(SERVICE_NAME, id.toString(), stringified);
}

/**
 * Retrieves the environment variables for a given SSH configuration ID.
 * @param {string|number} id The ID of the SSH configuration.
 * @returns {Promise<object|null>} The parsed environment object or null.
 */
async function getEnv(id) {
  const result = await keytar.getPassword(SERVICE_NAME, id.toString());
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch (err) {
    return null;
  }
}

/**
 * Deletes the securely stored environment variables for a given ID.
 * @param {string|number} id The ID of the SSH configuration.
 */
async function deleteEnv(id) {
  await keytar.deletePassword(SERVICE_NAME, id.toString());
}

module.exports = {
  setEnv,
  getEnv,
  deleteEnv
};
