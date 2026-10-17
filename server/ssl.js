const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const { getLocalIp } = require('./network');

const CERTS_DIR = path.join(__dirname, 'certs');
const CERT_FILE = path.join(CERTS_DIR, 'cert.pem');
const KEY_FILE = path.join(CERTS_DIR, 'key.pem');

/**
 * Loads existing SSL certificates or automatically generates a new
 * self-signed certificate with Subject Alternative Names (SAN) for
 * localhost and the current LAN IPv4 address.
 *
 * @returns {{ key: string, cert: string }} Object containing PEM-encoded private key and certificate
 */
function getOrCreateCertificates() {
  // Ensure certs directory exists
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  // If both cert and key already exist and are non-empty, load and return them
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    try {
      const cert = fs.readFileSync(CERT_FILE, 'utf8');
      const key = fs.readFileSync(KEY_FILE, 'utf8');
      if (cert.trim() && key.trim()) {
        return { key, cert };
      }
    } catch (err) {
      console.warn('[SSL] Existing certificate files could not be read. Regenerating...', err.message);
    }
  }

  console.log('[SSL] Generating self-signed SSL certificates with Subject Alternative Names...');

  const lanIp = getLocalIp();
  const pki = forge.pki;

  // Generate 2048-bit RSA key pair
  const keys = pki.rsa.generateKeyPair(2048);

  // Initialize certificate
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now();

  // Valid for 365 days
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setDate(notBefore.getDate() + 365);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const attrs = [
    { name: 'commonName', value: 'Smart Restaurant Server' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'Local' },
    { name: 'localityName', value: 'Local LAN' },
    { name: 'organizationName', value: 'Smart Restaurant' },
    { shortName: 'OU', value: 'Offline Server' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Subject Alternative Names (SAN) for localhost and LAN IP
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' }
  ];

  if (lanIp && lanIp !== '127.0.0.1') {
    altNames.push({ type: 7, ip: lanIp });
  }

  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true
    },
    {
      name: 'subjectAltName',
      altNames: altNames
    }
  ]);

  // Self-sign certificate using SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certPem = pki.certificateToPem(cert);
  const keyPem = pki.privateKeyToPem(keys.privateKey);

  // Write files to disk
  fs.writeFileSync(KEY_FILE, keyPem, { encoding: 'utf8', mode: 0o600 });
  fs.writeFileSync(CERT_FILE, certPem, { encoding: 'utf8', mode: 0o644 });

  console.log(`[SSL] Successfully created certificate for localhost and ${lanIp} at:`);
  console.log(`      - Cert: ${CERT_FILE}`);
  console.log(`      - Key:  ${KEY_FILE}`);

  return { key: keyPem, cert: certPem };
}

module.exports = {
  getOrCreateCertificates
};
