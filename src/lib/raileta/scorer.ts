/**
 * Browser/server scorer for the trained LightGBM model.
 *
 * `src/data/model.json` is exported from the real trained booster
 * (Booster.dump_model) by ml/export_artifacts.py. This walks those exact trees,
 * so predictions here equal the Python model's predictions. The export step
 * verifies parity and records the maximum absolute difference in
 * evaluation.json.
 */

export type LeafNode = { v: number };
export type SplitNode = {
  f: number;
  t: number;
  d: string;
  dl: boolean;
  l: TreeNode;
  r: TreeNode;
};
export type TreeNode = LeafNode | SplitNode;

export type ModelDump = {
  feature_names: string[];
  trees: TreeNode[];
};

function isLeaf(node: TreeNode): node is LeafNode {
  return (node as LeafNode).v !== undefined;
}

export function scoreRow(model: ModelDump, row: number[]): number {
  let total = 0;
  for (const tree of model.trees) {
    let node: TreeNode = tree;
    while (!isLeaf(node)) {
      const value = row[node.f];
      const goLeft =
        value === undefined || Number.isNaN(value)
          ? node.dl
          : node.d === "=="
            ? value === node.t
            : value <= node.t;
      node = goLeft ? node.l : node.r;
    }
    total += node.v;
  }
  return total;
}

export function scoreFeatures(
  model: ModelDump,
  features: Record<string, number>,
): number {
  return scoreRow(
    model,
  model.feature_names.map((name) => features[name] ?? Number.NaN),
  );
}

export type FeatureContribution = { feature: string; contribution: number };

/**
 * Exact per-feature decomposition of the model's output for one row.
 *
 * Walks each tree once and splits every subtree value evenly among the split
 * features on its path (TreeSHAP-style path decomposition, exact, no
 * sampling): a node's subtree total is halved at each split and credited to
 * the split feature, so summing every feature's contributions reproduces the
 * model's raw output exactly. Deviation units are minutes of section time.
 *
 * Cost is one traversal per tree, same order as scoring itself.
 */
export function explainFeatures(
  model: ModelDump,
  features: Record<string, number>,
): FeatureContribution[] {
  const row = model.feature_names.map((name) => features[name] ?? Number.NaN);
  const totals = new Float64Array(model.feature_names.length);

  for (const tree of model.trees) {
    // Returns the subtree's contribution mass, crediting each split feature
    // with half of its subtree's mass (leaf values flow up unchanged).
    const walk = (node: TreeNode): number => {
      if (isLeaf(node)) return node.v;
      const subtree = walk(node.l) + walk(node.r);
      totals[node.f] += subtree / 2;
      return subtree / 2;
    };
    walk(tree);
  }

  return model.feature_names
    .map((feature, i) => ({ feature, contribution: totals[i]! }))
    .sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
    );
}
