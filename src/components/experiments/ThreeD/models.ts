import type { TreeDefinition } from './TreeTemplate';
import { sakuraTree } from './SakuraTree';
import { oakTree } from './OakTree';

// Register a definition here to add it to the playground's model selector.
export const TREE_MODELS: readonly TreeDefinition[] = [sakuraTree, oakTree];
