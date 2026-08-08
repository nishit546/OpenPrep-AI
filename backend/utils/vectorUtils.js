/**
 * Compute cosine similarity between two equal-length numeric vectors.
 * Returns a value between -1 and 1 (1 = identical direction, i.e. semantically identical text).
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Greedily group items by embedding similarity. Each item is compared against
 * the first item ("representative") of every existing cluster; it joins the
 * first cluster whose representative it matches at or above `threshold`,
 * otherwise it starts a new cluster.
 * @param {Array<{ embedding: number[] }>} items
 * @param {number} threshold - cosine similarity cutoff (0-1)
 * @returns {Array<Array<Object>>} clusters
 */
function clusterByCosineSimilarity(items, threshold = 0.85) {
  const clusters = [];

  for (const item of items) {
    let matchedCluster = null;

    for (const cluster of clusters) {
      const representative = cluster[0];
      const similarity = cosineSimilarity(representative.embedding, item.embedding);
      if (similarity >= threshold) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.push(item);
    } else {
      clusters.push([item]);
    }
  }

  return clusters;
}

module.exports = { cosineSimilarity, clusterByCosineSimilarity };