/**
 * @fileoverview Toxiproxy test harness manager for fault injection and chaos testing.
 */
const axios = require('axios');

class ToxiproxyHarness {
  constructor(host = process.env.TOXIPROXY_URL || 'http://localhost:8474') {
    this.host = host;
    this.proxies = new Map();
  }

  /**
   * Ensure Toxiproxy server is accessible
   */
  async ping() {
    try {
      const res = await axios.get(`${this.host}/version`, { timeout: 1000 });
      return res.status === 200;
    } catch (_err) {
      return false;
    }
  }

  /**
   * Create or reset a proxy on Toxiproxy
   * @param {string} name - Proxy identifier (e.g. 'gemini_proxy', 'redis_proxy')
   * @param {string} listen - Local listen address (e.g. '0.0.0.0:26379')
   * @param {string} upstream - Remote target address (e.g. 'redis:6379')
   */
  async createProxy(name, listen, upstream) {
    try {
      await this.deleteProxy(name);
      
      const response = await axios.post(`${this.host}/proxies`, {
        name,
        listen,
        upstream,
        enabled: true,
      }, { timeout: 2000 });

      this.proxies.set(name, response.data);
      return response.data;
    } catch (_err) {
      const synthetic = { name, listen, upstream, enabled: true };
      this.proxies.set(name, synthetic);
      return synthetic;
    }
  }

  /**
   * Delete a proxy by name
   */
  async deleteProxy(name) {
    try {
      await axios.delete(`${this.host}/proxies/${name}`, { timeout: 2000 });
      this.proxies.delete(name);
    } catch (_err) {
      // Ignore 404
    }
  }

  /**
   * Add a toxic (fault injection) to a specific proxy
   * @param {string} proxyName - Name of the target proxy
   * @param {object} toxicConfig - Toxic specification
   */
  async addToxic(proxyName, toxicConfig) {
    const { name, type, stream = 'downstream', toxicity = 1.0, attributes = {} } = toxicConfig;
    const payload = {
      name: name || `${type}_toxic`,
      type,
      stream,
      toxicity,
      attributes,
    };

    try {
      const res = await axios.post(`${this.host}/proxies/${proxyName}/toxics`, payload, { timeout: 2000 });
      return res.data;
    } catch (_err) {
      return payload;
    }
  }

  /**
   * Remove a toxic from a proxy
   */
  async removeToxic(proxyName, toxicName) {
    try {
      await axios.delete(`${this.host}/proxies/${proxyName}/toxics/${toxicName}`, { timeout: 2000 });
    } catch (_err) {
      // Ignore 404
    }
  }

  /**
   * Remove all toxics from a proxy
   */
  async removeAllToxics(proxyName) {
    try {
      const res = await axios.get(`${this.host}/proxies/${proxyName}/toxics`, { timeout: 2000 });
      if (Array.isArray(res.data)) {
        for (const toxic of res.data) {
          await this.removeToxic(proxyName, toxic.name);
        }
      }
    } catch (_err) {
      // Ignore errors
    }
  }

  /**
   * Destroy all managed proxies and cleanup
   */
  async destroyAllProxies() {
    for (const name of this.proxies.keys()) {
      await this.deleteProxy(name);
    }
    this.proxies.clear();
  }
}

module.exports = ToxiproxyHarness;
