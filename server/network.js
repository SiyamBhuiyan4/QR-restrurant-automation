const os = require('os');

/**
 * Detects the local machine's LAN IPv4 address.
 * Prioritizes active Wi-Fi and Ethernet interfaces, falling back to 127.0.0.1.
 * @returns {string} The LAN IPv4 address or 127.0.0.1
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;

    for (const net of netList) {
      // Must be IPv4 and not an internal loopback address
      const isIpv4 = net.family === 'IPv4' || net.family === 4;
      if (isIpv4 && !net.internal) {
        // Exclude link-local / APIPA addresses (169.254.x.x)
        if (net.address.startsWith('169.254.')) continue;

        let score = 1;

        // Prioritize typical Wi-Fi / Ethernet adapter names on macOS/Linux/Windows
        if (/^(en|eth|wlan|wi-fi|ethernet)/i.test(name)) {
          score += 10;
        }

        // Prioritize standard private IP ranges
        if (net.address.startsWith('192.168.')) {
          score += 5;
        } else if (net.address.startsWith('10.')) {
          score += 4;
        } else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address)) {
          score += 3;
        }

        candidates.push({ address: net.address, score, name });
      }
    }
  }

  if (candidates.length > 0) {
    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].address;
  }

  return '127.0.0.1';
}

/**
 * Outputs a clear startup banner with local and LAN URLs.
 * @param {number|string} port 
 * @param {string} protocol 'http' | 'https'
 */
function printServerBanner(port = 3000, protocol = 'https') {
  const lanIp = getLocalIp();
  const localUrl = `${protocol}://localhost:${port}`;
  const networkUrl = `${protocol}://${lanIp}:${port}`;
  const kdsUrl = `${protocol}://${lanIp}:${port}/kds`;
  const adminUrl = `${protocol}://${lanIp}:${port}/admin`;

  const border = '═'.repeat(66);
  const divider = '─'.repeat(66);

  console.log('\n' + border);
  console.log('  🍽️   SMART RESTAURANT — OFFLINE-FIRST LOCAL SERVER');
  console.log(border);
  console.log(`  Protocol:     ${protocol.toUpperCase()} ${protocol === 'https' ? '(Self-Signed SSL for LAN enabled)' : ''}`);
  console.log(`  Local URL:    ${localUrl}`);
  console.log(`  Network URL:  ${networkUrl}`);
  console.log(`  KDS (Kitchen):${kdsUrl}`);
  console.log(`  Admin Panel:  ${adminUrl}`);
  console.log(divider);
  console.log('  📱 MOBILE & TABLET ORDERING (LAN):');
  console.log(`     Customers & Waiters connect via: ${networkUrl}`);
  if (protocol === 'https') {
    console.log('  🔒 SSL CERTIFICATE NOTE:');
    console.log('     When accessing from a phone/tablet, your browser will display');
    console.log('     a security warning. Click "Advanced" -> "Proceed to site (unsafe)"');
    console.log('     once. HTTPS is required for Camera QR scanning and Audio recording!');
  }
  console.log(border + '\n');
}

module.exports = {
  getLocalIp,
  printServerBanner
};
