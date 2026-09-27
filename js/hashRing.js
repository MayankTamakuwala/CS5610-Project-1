// Ring positions run clockwise; 0 is at the top.

export const RING_SIZE = 2 ** 32;

/**
 * FNV-1a over UTF-16 code units; fmix32 spreads similar keys apart.
 * @param {string} text
 * @returns {number} Unsigned 32-bit hash.
 */
export function hashKey(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function clockwiseDistance(from, to) {
  return (to - from + RING_SIZE) % RING_SIZE;
}

export class HashRing {
  /**
   * @param {string[]} nodeIds Physical nodes.
   * @param {number} [replicas=4] Virtual nodes placed per physical node.
   */
  constructor(nodeIds, replicas = 4) {
    if (
      !Array.isArray(nodeIds) ||
      nodeIds.length === 0 ||
      nodeIds.some((id) => typeof id !== "string" || id.trim() === "") ||
      new Set(nodeIds).size !== nodeIds.length
    ) {
      throw new TypeError("Provide at least one distinct, nonempty node ID.");
    }
    if (!Number.isInteger(replicas) || replicas < 1) {
      throw new RangeError("Replicas must be a positive integer.");
    }
    this.nodeIds = [...nodeIds];
    this.replicas = replicas;
    this.offline = new Set();
    this.points = this.nodeIds
      .flatMap((nodeId) =>
        Array.from({ length: replicas }, (_, replica) => ({
          nodeId,
          replica,
          hash: hashKey(`${nodeId}#${replica}`),
        }))
      )
      .sort((a, b) => a.hash - b.hash);
  }

  /** @param {string} nodeId */
  isOnline(nodeId) {
    return !this.offline.has(nodeId);
  }

  /** @returns {string[]} */
  onlineNodes() {
    return this.nodeIds.filter((nodeId) => this.isOnline(nodeId));
  }

  /**
   * Keep one node online so keys always have somewhere to go.
   * @param {string} nodeId
   * @param {boolean} online
   * @returns {boolean} Whether the change was applied.
   */
  setOnline(nodeId, online) {
    if (online) {
      this.offline.delete(nodeId);
      return true;
    }
    if (this.isOnline(nodeId) && this.onlineNodes().length <= 1) {
      return false;
    }
    this.offline.add(nodeId);
    return true;
  }

  /**
   * Find the next clockwise point, skipping offline nodes.
   * @param {number} hash
   * @param {Set<string>} [offline=this.offline]
   */
  pointFor(hash, offline = this.offline) {
    const { points } = this;
    let low = 0;
    let high = points.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (points[mid].hash < hash) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    for (let step = 0; step < points.length; step += 1) {
      const point = points[(low + step) % points.length];
      if (!offline.has(point.nodeId)) {
        return point;
      }
    }
    return null;
  }

  /**
   * @param {string} key
   * @returns {{ key: string, hash: number, point: object }}
   */
  route(key) {
    const hash = hashKey(key);
    return { key, hash, point: this.pointFor(hash) };
  }

  /**
   * @param {string[]} keys
   * @returns {Map<string, number>}
   */
  loadShare(keys) {
    const counts = new Map(this.nodeIds.map((nodeId) => [nodeId, 0]));
    for (const key of keys) {
      const { nodeId } = this.pointFor(hashKey(key));
      counts.set(nodeId, counts.get(nodeId) + 1);
    }
    return counts;
  }

  /**
   * Compare key movement against the all-online baseline.
   * @param {string[]} keys
   * @returns {{ total: number, ringMoved: number, moduloMoved: number }}
   */
  movement(keys) {
    const noneOffline = new Set();
    const online = this.onlineNodes();
    let ringMoved = 0;
    let moduloMoved = 0;
    for (const key of keys) {
      const hash = hashKey(key);
      const before = this.pointFor(hash, noneOffline).nodeId;
      if (this.pointFor(hash).nodeId !== before) {
        ringMoved += 1;
      }
      const moduloBefore = this.nodeIds[hash % this.nodeIds.length];
      const moduloAfter = online[hash % online.length];
      if (moduloBefore !== moduloAfter) {
        moduloMoved += 1;
      }
    }
    return { total: keys.length, ringMoved, moduloMoved };
  }
}
